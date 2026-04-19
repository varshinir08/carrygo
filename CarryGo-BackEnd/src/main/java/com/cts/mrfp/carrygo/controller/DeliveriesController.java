package com.cts.mrfp.carrygo.controller;


import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.dto.DeliveriesDTO;
import com.cts.mrfp.carrygo.repository.UsersRepository;
import com.cts.mrfp.carrygo.service.DeliveriesService;
import com.cts.mrfp.carrygo.service.PorterRouteService;
import com.cts.mrfp.carrygo.model.PorterRoute;
import com.cts.mrfp.carrygo.util.DTOConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/deliveries")
@CrossOrigin(origins = "*")
public class DeliveriesController {

    @Autowired private DeliveriesService deliveryService;
    @Autowired private UsersRepository usersRepository;
    @Autowired private PorterRouteService routeService;
    @Autowired private com.cts.mrfp.carrygo.repository.PorterRouteRepository porterRouteRepository;

    @PostMapping
    public ResponseEntity<?> createDelivery(@RequestBody DeliveriesDTO deliveryDTO) {
        Deliveries delivery = new Deliveries();

        // Wire sender from senderId
        if (deliveryDTO.getSenderId() != null) {
            Users sender = usersRepository.findById(deliveryDTO.getSenderId()).orElse(null);
            if (sender == null) return ResponseEntity.badRequest().body("Sender not found");
            delivery.setSender(sender);
        }

        delivery.setPickupAddress(deliveryDTO.getPickupAddress());
        delivery.setPickupLat(deliveryDTO.getPickupLat());
        delivery.setPickupLng(deliveryDTO.getPickupLng());
        delivery.setPickupContact(deliveryDTO.getPickupContact());
        delivery.setPickupPhone(deliveryDTO.getPickupPhone());
        delivery.setDropAddress(deliveryDTO.getDropAddress());
        delivery.setDropLat(deliveryDTO.getDropLat());
        delivery.setDropLng(deliveryDTO.getDropLng());
        delivery.setReceiverName(deliveryDTO.getReceiverName());
        delivery.setReceiverPhone(deliveryDTO.getReceiverPhone());
        delivery.setPackageType(deliveryDTO.getPackageType());
        delivery.setWeightKg(deliveryDTO.getWeightKg());
        delivery.setPackageSize(deliveryDTO.getPackageSize());
        delivery.setSpecialInstructions(deliveryDTO.getSpecialInstructions());
        delivery.setDeliveryType(deliveryDTO.getDeliveryType());
        delivery.setPreferredDate(deliveryDTO.getPreferredDate());
        delivery.setPreferredTime(deliveryDTO.getPreferredTime());
        delivery.setFlexibleMatching(deliveryDTO.getFlexibleMatching());
        delivery.setDistanceKm(deliveryDTO.getDistanceKm());
        delivery.setBasePrice(deliveryDTO.getBasePrice());
        delivery.setDistanceCost(deliveryDTO.getDistanceCost());
        delivery.setServiceFee(deliveryDTO.getServiceFee());
        delivery.setTotalAmount(deliveryDTO.getTotalAmount());

        Deliveries saved = deliveryService.saveDelivery(delivery);
        return ResponseEntity.ok(DTOConverter.convertDeliveriesToDTO(saved));
    }

    @GetMapping("/user/{userId}")
    public List<DeliveriesDTO> getUserDeliveries(@PathVariable Integer userId) {
        List<Deliveries> deliveries = deliveryService.getDeliveriesByUser(userId);
        return deliveries.stream().map(DTOConverter::convertDeliveriesToDTO).collect(Collectors.toList());
    }

    // NEW: Get all pending deliveries for commuters to browse
    @GetMapping("/available")
    public List<DeliveriesDTO> getAvailable() {
        List<Deliveries> deliveries = deliveryService.getAllAvailableDeliveries();
        return deliveries.stream().map(DTOConverter::convertDeliveriesToDTO).collect(Collectors.toList());
    }

    // Get deliveries assigned to a porter (commuter)
    @GetMapping("/commuter/{commuterId}")
    public List<DeliveriesDTO> getCommuterDeliveries(@PathVariable Integer commuterId) {
        List<Deliveries> deliveries = deliveryService.getDeliveriesByCommuter(commuterId);
        return deliveries.stream().map(DTOConverter::convertDeliveriesToDTO).collect(Collectors.toList());
    }

    // Update delivery status (e.g., PICKED_UP, DELIVERED)
    @PatchMapping("/{id}/status")
    public DeliveriesDTO updateStatus(@PathVariable Integer id, @RequestParam String status) {
        Deliveries delivery = deliveryService.updateStatus(id, status);
        return DTOConverter.convertDeliveriesToDTO(delivery);
    }

    // Porter accepts a delivery request — returns 409 if already taken
    @PatchMapping("/{id}/accept")
    public ResponseEntity<?> acceptDelivery(@PathVariable Integer id, @RequestParam Integer commuterId) {
        try {
            Deliveries delivery = deliveryService.acceptDelivery(id, commuterId);
            return ResponseEntity.ok(DTOConverter.convertDeliveriesToDTO(delivery));
        } catch (RuntimeException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    /**
     * Returns the count of online porters whose routes match the given coordinates.
     * Used by the frontend to show "X porters available" without posting a delivery yet.
     */
    @GetMapping("/matching-porters-count")
    public ResponseEntity<Integer> getMatchingPortersCount(
            @RequestParam(required = false) Float pickupLat,
            @RequestParam(required = false) Float pickupLng,
            @RequestParam(required = false) Float dropLat,
            @RequestParam(required = false) Float dropLng) {

        if (pickupLat == null || dropLat == null) {
            // No coordinates — count all online porters
            long count = usersRepository.findByIsOnlineTrue().stream()
                .filter(u -> u.getRole() != null && u.getRole().contains("porter"))
                .count();
            return ResponseEntity.ok((int) count);
        }

        List<com.cts.mrfp.carrygo.model.Users> onlinePorters = usersRepository.findByIsOnlineTrue().stream()
            .filter(u -> u.getRole() != null && u.getRole().contains("porter"))
            .collect(java.util.stream.Collectors.toList());

        int count = 0;
        for (com.cts.mrfp.carrygo.model.Users porter : onlinePorters) {
            List<PorterRoute> routes = porterRouteRepository.findByPorterUserId(porter.getUserId());
            if (routes.isEmpty()) {
                count++; // porter with no routes sees all deliveries
            } else {
                boolean matches = routes.stream().anyMatch(r ->
                    routeService.matchesDelivery(r, pickupLat, pickupLng, dropLat, dropLng));
                if (matches) count++;
            }
        }
        return ResponseEntity.ok(count);
    }

    // Get PENDING deliveries matched to a specific porter's routes
    @GetMapping("/matched/{porterId}")
    public List<DeliveriesDTO> getMatchedDeliveries(@PathVariable Integer porterId) {
        List<Deliveries> pending = deliveryService.getAllAvailableDeliveries();
        List<PorterRoute> routes = routeService.getRoutesByPorter(porterId);

        return pending.stream()
            .filter(d -> {
                // No coords on delivery → show to everyone (fallback)
                if (d.getPickupLat() == null || d.getDropLat() == null) return true;
                // No routes set → show everything
                if (routes.isEmpty()) return true;
                // Match if any route fits
                return routes.stream().anyMatch(r ->
                    routeService.matchesDelivery(r, d.getPickupLat(), d.getPickupLng(),
                                                    d.getDropLat(),   d.getDropLng()));
            })
            .map(DTOConverter::convertDeliveriesToDTO)
            .collect(Collectors.toList());
    }
    // Get a specific delivery by ID
    @GetMapping("/{id}")
    public DeliveriesDTO getDeliveryById(@PathVariable Integer id) {
        Deliveries delivery = deliveryService.getDeliveryById(id);
        return DTOConverter.convertDeliveriesToDTO(delivery);
    }


    @GetMapping("/user/{userId}/deliveries")
    public List<DeliveriesDTO> getPersonalizedUserDeliveries(@PathVariable Integer userId) {
        List<Deliveries> deliveries = deliveryService.getDeliveriesByUser(userId);
        return deliveries.stream().map(DTOConverter::convertDeliveriesToDTO).collect(Collectors.toList());
    }
}
