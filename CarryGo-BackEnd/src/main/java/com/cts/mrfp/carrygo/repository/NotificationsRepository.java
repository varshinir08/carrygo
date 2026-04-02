package com.cts.mrfp.carrygo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cts.mrfp.carrygo.model.Notifications;

public interface NotificationsRepository extends JpaRepository<Notifications, Integer> {
    List<Notifications> findByUserUserIdOrderByCreatedAtDesc(Integer userId);
}