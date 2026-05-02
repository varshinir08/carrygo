package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.dto.DeliveriesDTO;
import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.model.Notifications;
import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.repository.DeliveriesRepository;
import com.cts.mrfp.carrygo.repository.NotificationsRepository;
import com.cts.mrfp.carrygo.repository.UsersRepository;
import com.cts.mrfp.carrygo.util.DTOConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DeliveriesService {

    @Autowired private DeliveriesRepository deliveriesRepo;
    @Autowired private UsersRepository usersRepo;
    @Autowired private WalletsService walletsService;
    @Autowired private NotificationsRepository notificationsRepo;
    @Autowired private WebSocketMessagingService wsService;

    // ── Create delivery ───────────────────────────────────────────────────────

    public Deliveries saveDelivery(Deliveries delivery) {
        delivery.setCreatedAt(LocalDateTime.now());
        delivery.setStatus("PENDING");

        // Generate 4-digit OTP for ride start
        String otp = String.format("%04d", new Random().nextInt(10000));
        delivery.setOtp(otp);

        Deliveries saved = deliveriesRepo.save(delivery);

        // Count matching porters for broadcast progress state
        List<Users> matchingPorters = findMatchingPorters(saved);
        saved.setTotalPool(matchingPorters.size());
        saved.setTotalNotified(matchingPorters.size());
        saved.setTotalRejected(0);
        saved = deliveriesRepo.save(saved);

        DeliveriesDTO savedDTO = DTOConverter.convertDeliveriesToDTO(saved);

        // Broadcast new ride request to ALL connected porters via WebSocket topic
        wsService.pushToPorters("rideRequest", savedDTO);

        // Persist DB notifications for matched porters (catch-up for offline porters)
        for (Users porter : matchingPorters) {
            sendNewRequestNotification(porter, saved);
        }

        // Push initial broadcast state to sender
        if (saved.getSender() != null) {
            wsService.push(saved.getSender().getUserId(), "broadcastUpdate",
                buildBroadcastState(saved, false));
        }

        return saved;
    }

    // ── Find matching online porters ──────────────────────────────────────────

    private List<Users> findMatchingPorters(Deliveries delivery) {
        if (delivery.getPickupAddress() == null || delivery.getPickupAddress().isBlank()
         || delivery.getDropAddress()   == null || delivery.getDropAddress().isBlank()) {
            return java.util.Collections.emptyList();
        }

        List<Users> available = usersRepo.findByIsOnlineTrue().stream()
            .filter(u -> u.getRole() != null && u.getRole().contains("porter"))
            .filter(u -> !hasActiveDelivery(u.getUserId()))
            .collect(Collectors.toList());

        return available;
    }

    private boolean hasActiveDelivery(Integer porterId) {
        return deliveriesRepo.findByCommuterUserId(porterId).stream()
            .anyMatch(d -> d.getStatus() != null &&
                List.of("ACCEPTED", "ARRIVED_AT_PICKUP", "PICKED_UP").contains(d.getStatus()));
    }

    // ── Porter rejects a request (or timer expires) ───────────────────────────

    @Transactional
    public void rejectDelivery(Integer deliveryId, Integer commuterId) {
        Deliveries d = deliveriesRepo.findById(deliveryId).orElseThrow();
        if (!"PENDING".equals(d.getStatus())) return;

        int rejected = (d.getTotalRejected() == null ? 0 : d.getTotalRejected()) + 1;
        d.setTotalRejected(rejected);
        deliveriesRepo.save(d);

        if (d.getSender() != null) {
            int pool = (d.getTotalPool() == null || d.getTotalPool() == 0) ? 1 : d.getTotalPool();
            boolean allExhausted = rejected >= pool;
            Map<String, Object> state = buildBroadcastState(d, allExhausted);
            wsService.push(d.getSender().getUserId(), "broadcastUpdate", state);
        }
    }

    // ── Porter marks arrived at pickup ────────────────────────────────────────

    @Transactional
    public Deliveries markArrived(Integer deliveryId, Integer commuterId) {
        Deliveries d = deliveriesRepo.findById(deliveryId).orElseThrow();
        if (!"ACCEPTED".equals(d.getStatus()))
            throw new RuntimeException("Delivery must be ACCEPTED to mark arrival");

        d.setStatus("ARRIVED_AT_PICKUP");
        d.setArrivedAt(LocalDateTime.now());
        Deliveries saved = deliveriesRepo.save(d);

        if (d.getSender() != null) {
            sendStatusNotification(d.getSender(),
                "Your delivery partner has arrived at the pickup location! Share OTP: " + d.getOtp());
            wsService.push(d.getSender().getUserId(), "statusUpdate",
                DTOConverter.convertDeliveriesToDTO(saved));
        }
        return saved;
    }

    // ── Verify OTP and start the ride ─────────────────────────────────────────

    @Transactional
    public Deliveries verifyOtp(Integer deliveryId, String enteredOtp) {
        Deliveries d = deliveriesRepo.findById(deliveryId).orElseThrow();
        if (!"ARRIVED_AT_PICKUP".equals(d.getStatus()))
            throw new RuntimeException("Porter must be at pickup before verifying OTP");

        if (d.getOtp() == null || !d.getOtp().equals(enteredOtp.trim()))
            throw new RuntimeException("OTP_MISMATCH");

        d.setStatus("PICKED_UP");
        Deliveries saved = deliveriesRepo.save(d);

        if (d.getSender() != null) {
            sendStatusNotification(d.getSender(), "Your parcel is on the way!");
            wsService.push(d.getSender().getUserId(), "statusUpdate",
                DTOConverter.convertDeliveriesToDTO(saved));
        }
        return saved;
    }

    // ── Existing methods ──────────────────────────────────────────────────────

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

        if ("DELIVERED".equals(status) && d.getCommuter() != null) {
            float amount = (d.getTotalAmount() != null) ? d.getTotalAmount() : 50f;
            try { walletsService.updateBalance(d.getCommuter().getUserId(), amount); }
            catch (Exception ignored) {}
        }

        if (d.getSender() != null) {
            String msg = switch (status) {
                case "PICKED_UP"  -> "Your parcel has been picked up and is on the way!";
                case "DELIVERED"  -> "Your parcel has been delivered successfully!";
                default -> null;
            };
            if (msg != null) {
                sendStatusNotification(d.getSender(), msg);
                wsService.push(d.getSender().getUserId(), "statusUpdate",
                    DTOConverter.convertDeliveriesToDTO(saved));
            }
        }
        return saved;
    }

    @Transactional
    public Deliveries acceptDelivery(Integer deliveryId, Integer commuterId) {
        Deliveries d = deliveriesRepo.findById(deliveryId).orElseThrow();
        if (!"PENDING".equals(d.getStatus()))
            throw new RuntimeException("Delivery is no longer available (already accepted)");
        if (hasActiveDelivery(commuterId))
            throw new RuntimeException("You already have an active delivery in progress");

        Users commuter = usersRepo.findById(commuterId).orElseThrow();
        d.setCommuter(commuter);
        d.setStatus("ACCEPTED");
        Deliveries saved = deliveriesRepo.save(d);

        DeliveriesDTO dto = DTOConverter.convertDeliveriesToDTO(saved);

        if (d.getSender() != null) {
            sendStatusNotification(d.getSender(),
                commuter.getName() + " has accepted your delivery! They're heading to pickup.");
            wsService.push(d.getSender().getUserId(), "statusUpdate", dto);
            wsService.push(d.getSender().getUserId(), "broadcastUpdate",
                Map.of("status", "accepted", "commuterName", commuter.getName(),
                       "deliveryId", deliveryId));
        }
        return saved;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void sendNewRequestNotification(Users porter, Deliveries delivery) {
        Notifications n = new Notifications();
        n.setUser(porter);
        n.setType("NEW_DELIVERY_REQUEST");
        n.setMessage("New request: " + delivery.getPickupAddress()
                     + " → " + delivery.getDropAddress());
        n.setIsRead(false);
        n.setCreatedAt(LocalDateTime.now());
        notificationsRepo.save(n);
    }

    private void sendStatusNotification(Users recipient, String message) {
        Notifications n = new Notifications();
        n.setUser(recipient);
        n.setType("DELIVERY_STATUS_UPDATE");
        n.setMessage(message);
        n.setIsRead(false);
        n.setCreatedAt(LocalDateTime.now());
        notificationsRepo.save(n);
    }

    private Map<String, Object> buildBroadcastState(Deliveries d, boolean exhausted) {
        int pool       = d.getTotalPool()      != null ? d.getTotalPool()      : 0;
        int notified   = d.getTotalNotified()  != null ? d.getTotalNotified()  : 0;
        int rejected   = d.getTotalRejected()  != null ? d.getTotalRejected()  : 0;
        int pending    = Math.max(0, notified - rejected);
        int pct        = (notified == 0) ? 0 : (notified * 100 / Math.max(pool, 1));

        Map<String, Object> state = new LinkedHashMap<>();
        state.put("deliveryId",      d.getDeliveryId());
        state.put("status",          exhausted ? "no_drivers" : "searching");
        state.put("totalPool",       pool);
        state.put("totalNotified",   notified);
        state.put("accepted",        0);
        state.put("rejected",        rejected);
        state.put("pending",         pending);
        state.put("progressPercent", pct);
        return state;
    }
}
