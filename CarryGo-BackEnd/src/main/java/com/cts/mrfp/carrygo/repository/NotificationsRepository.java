package com.cts.mrfp.carrygo.repository;
import com.cts.mrfp.carrygo.model.Notifications;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationsRepository extends JpaRepository<Notifications, Integer> {
    List<Notifications> findByUserUserIdOrderByCreatedAtDesc(Integer userId);
}