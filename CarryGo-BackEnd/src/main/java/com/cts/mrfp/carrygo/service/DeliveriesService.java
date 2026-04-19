
package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.model.Notifications;
import com.cts.mrfp.carrygo.model.PorterRoute;
import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.repository.DeliveriesRepository;
import com.cts.mrfp.carrygo.repository.NotificationsRepository;
import com.cts.mrfp.carrygo.repository.PorterRouteRepository;
import com.cts.mrfp.carrygo.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DeliveriesService {
    @Autowired private DeliveriesRepository deliveriesRepo;
    @Autowired private UsersRepository usersRepo;
    @Autowired private WalletsService walletsService;
    @Autowired private NotificationsRepository notificationsRepo;
    @Autowired private PorterRouteRepository routeRepo;
    @Autowired private PorterRouteService routeService;

    public Deliveries saveDelivery(Deliveries delivery) {
        delivery.setCreatedAt(LocalDateTime.now());
        delivery.setStatus("PENDING");
        Deliveries saved = deliveriesRepo.save(delivery);

        // Notify every online porter whose route matches this delivery
        if (saved.getPickupLat() != null && saved.getDropLat() != null) {
            List<Users> onlineUsers = usersRepo.findByIsOnlineTrue();
            for (Users porter : onlineUsers) {
                if (porter.getRole() == null || !porter.getRole().contains("porter")) continue;
                List<PorterRoute> routes = routeRepo.findByPorterUserId(porter.getUserId());
                if (routes.isEmpty()) {
                    // Porter with no routes sees all requests
                    sendNewRequestNotification(porter, saved);
                } else {
                    boolean matches = routes.stream().anyMatch(r ->
                        routeService.matchesDelivery(r,
                            saved.getPickupLat(), saved.getPickupLng(),
                            saved.getDropLat(),   saved.getDropLng()));
                    if (matches) sendNewRequestNotification(porter, saved);
                }
            }
        }
        return saved;
    }

    private void sendNewRequestNotification(Users porter, Deliveries delivery) {
        Notifications n = new Notifications();
        n.setUser(porter);
        n.setType("NEW_DELIVERY_REQUEST");
        n.setMessage("New delivery request: " + delivery.getPickupAddress()
                     + " → " + delivery.getDropAddress());
        n.setIsRead(false);
        n.setCreatedAt(LocalDateTime.now());
        notificationsRepo.save(n);
    }

    public List<Deliveries> getDeliveriesByUser(Integer userId) {
        return deliveriesRepo.findBySenderUserId(userId);
    }

    public List<Deliveries> getDeliveriesByCommuter(Integer commuterId) {
        return deliveriesRepo.findByCommuterUserId(commuterId);
    }

    public List<Deliveries> getAllAvailableDeliveries() {
        return deliveriesRepo.findByStatus("PENDING");
    }

    public Deliveries getDeliveryById(Integer id) {
        return deliveriesRepo.findById(id).orElseThrow(
            () -> new RuntimeException("Delivery not found: " + id));
    }

    public Deliveries updateStatus(Integer id, String status) {
        Deliveries d = deliveriesRepo.findById(id).orElseThrow();
        d.setStatus(status);
        Deliveries saved = deliveriesRepo.save(d);
        // Credit porter ₹50 on delivery
        if ("DELIVERED".equals(status) && d.getCommuter() != null) {
            try { walletsService.updateBalance(d.getCommuter().getUserId(), 50.0f); } catch (Exception ignored) {}
        }
        // Notify sender of status change
        if (d.getSender() != null) {
            String msg = switch (status) {
                case "PICKED_UP"  -> "Your parcel has been picked up and is on the way!";
                case "DELIVERED"  -> "Your parcel has been delivered successfully!";
                default -> null;
            };
            if (msg != null) {
                Notifications n = new Notifications();
                n.setUser(d.getSender());
                n.setType("DELIVERY_STATUS_UPDATE");
                n.setMessage(msg);
                n.setIsRead(false);
                n.setCreatedAt(LocalDateTime.now());
                notificationsRepo.save(n);
            }
        }
        return saved;
    }

    @Transactional
    public Deliveries acceptDelivery(Integer deliveryId, Integer commuterId) {
        Deliveries d = deliveriesRepo.findById(deliveryId).orElseThrow();
        // Atomic: only accept if still PENDING — prevents two porters accepting the same delivery
        if (!"PENDING".equals(d.getStatus())) {
            throw new RuntimeException("Delivery is no longer available (already accepted)");
        }
        Users commuter = usersRepo.findById(commuterId).orElseThrow();
        d.setCommuter(commuter);
        d.setStatus("ACCEPTED");
        Deliveries saved = deliveriesRepo.save(d);
        // Notify the sender
        if (d.getSender() != null) {
            Notifications n = new Notifications();
            n.setUser(d.getSender());
            n.setType("ORDER_ACCEPTED");
            n.setMessage(commuter.getName() + " has accepted your delivery request! They will pick it up soon.");
            n.setIsRead(false);
            n.setCreatedAt(LocalDateTime.now());
            notificationsRepo.save(n);
        }
        return saved;
    }
}
