package com.cts.mrfp.carrygo.controller;


import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.service.DeliveriesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/deliveries")
@CrossOrigin(origins = "*")
public class DeliveriesController {

    @Autowired
    private DeliveriesService deliveryService;

    @PostMapping
    public Deliveries createDelivery(@RequestBody Deliveries delivery) {
        return deliveryService.saveDelivery(delivery);
    }

    @GetMapping("/user/{userId}")
    public List<Deliveries> getUserDeliveries(@PathVariable Integer userId) {
        return deliveryService.getDeliveriesByUser(userId);
    }
}
