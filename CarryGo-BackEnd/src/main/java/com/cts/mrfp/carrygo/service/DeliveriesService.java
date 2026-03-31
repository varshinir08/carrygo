package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.repository.DeliveriesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
@Service
public class DeliveriesService {
    @Autowired private DeliveriesRepository deliveriesRepo;

    public Deliveries saveDelivery(Deliveries delivery) {
        delivery.setCreatedAt(LocalDateTime.now());
        delivery.setStatus("PENDING");
        return deliveriesRepo.save(delivery);
    }

    public List<Deliveries> getDeliveriesByUser(Integer userId) {
        return deliveriesRepo.findBySenderUserId(userId);
    }

    public List<Deliveries> getAllAvailableDeliveries() {
        return deliveriesRepo.findByStatus("PENDING");
    }

    public Deliveries updateStatus(Integer id, String status) {
        Deliveries d = deliveriesRepo.findById(id).orElseThrow();
        d.setStatus(status);
        return deliveriesRepo.save(d);
    }
}