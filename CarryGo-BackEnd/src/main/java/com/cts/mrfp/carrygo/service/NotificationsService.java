package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Notifications;
import com.cts.mrfp.carrygo.repository.NotificationsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationsService {

    @Autowired
    private NotificationsRepository notificationsRepository;

    public Notifications sendNotification(Notifications notification) {
        notification.setCreatedAt(LocalDateTime.now());
        notification.setIsRead(false);
        return notificationsRepository.save(notification);
    }

    public List<Notifications> getUserNotifications(Integer userId) {
        return notificationsRepository.findByUserUserIdOrderByCreatedAtDesc(userId);
    }

    public void markAsRead(Integer notificationId) {
        notificationsRepository.findById(notificationId).ifPresent(n -> {
            n.setIsRead(true);
            notificationsRepository.save(n);
        });
    }
}