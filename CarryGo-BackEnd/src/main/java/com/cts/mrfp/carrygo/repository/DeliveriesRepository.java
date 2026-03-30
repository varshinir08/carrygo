package com.cts.mrfp.carrygo.repository;

import com.cts.mrfp.carrygo.model.Deliveries;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveriesRepository extends JpaRepository<Deliveries, Integer> {
    List<Deliveries> findBySenderUserId(Integer userId);
}
