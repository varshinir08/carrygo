package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.repository.DeliveriesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DeliveriesService {

    @Autowired
    private DeliveriesRepository deliveryRepository;

    public Deliveries saveDelivery(Deliveries delivery) {
        delivery.setStatus("PENDING"); // default
        return deliveryRepository.save(delivery);
    }
    public List<Deliveries> getDeliveriesByUser(Integer userId) {
        return deliveryRepository.findBySenderUserId(userId);
    }
}
