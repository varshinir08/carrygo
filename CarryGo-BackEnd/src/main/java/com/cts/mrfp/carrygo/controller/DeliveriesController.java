package com.cts.mrfp.carrygo.controller;


import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.dto.DeliveriesDTO;
import com.cts.mrfp.carrygo.service.DeliveriesService;
import com.cts.mrfp.carrygo.util.DTOConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/deliveries")
@CrossOrigin(origins = "*")
public class DeliveriesController {

    @Autowired private DeliveriesService deliveryService;

    @PostMapping
    public DeliveriesDTO createDelivery(@RequestBody DeliveriesDTO deliveryDTO) {
        Deliveries delivery = new Deliveries();
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
        return DTOConverter.convertDeliveriesToDTO(saved);
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

    // NEW: Update delivery status (e.g., Picked Up, Delivered)
    @PatchMapping("/{id}/status")
    public DeliveriesDTO updateStatus(@PathVariable Integer id, @RequestParam String status) {
        Deliveries delivery = deliveryService.updateStatus(id, status);
        return DTOConverter.convertDeliveriesToDTO(delivery);
    }
}
