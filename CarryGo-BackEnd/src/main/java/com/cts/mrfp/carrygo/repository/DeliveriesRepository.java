package com.cts.mrfp.carrygo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cts.mrfp.carrygo.model.Deliveries;

public interface DeliveriesRepository extends JpaRepository<Deliveries, Integer> {
    List<Deliveries> findBySenderUserId(Integer userId);
    List<Deliveries> findByCommuterUserId(Integer userId);
    List<Deliveries> findByStatus(String status);
}