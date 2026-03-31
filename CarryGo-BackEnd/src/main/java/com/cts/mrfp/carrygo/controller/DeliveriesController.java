package com.cts.mrfp.carrygo.controller;


import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.service.DeliveriesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deliveries")
@CrossOrigin(origins = "*")
public class DeliveriesController {

    @Autowired private DeliveriesService deliveryService;

    @PostMapping
    public Deliveries createDelivery(@RequestBody Deliveries delivery) {
        return deliveryService.saveDelivery(delivery);
    }

    @GetMapping("/user/{userId}")
    public List<Deliveries> getUserDeliveries(@PathVariable Integer userId) {
        return deliveryService.getDeliveriesByUser(userId);
    }

    // NEW: Get all pending deliveries for commuters to browse
    @GetMapping("/available")
    public List<Deliveries> getAvailable() {
        return deliveryService.getAllAvailableDeliveries();
    }

    // NEW: Update delivery status (e.g., Picked Up, Delivered)
    @PatchMapping("/{id}/status")
    public Deliveries updateStatus(@PathVariable Integer id, @RequestParam String status) {
        return deliveryService.updateStatus(id, status);
    }
}
