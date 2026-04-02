package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Notifications;
import com.cts.mrfp.carrygo.dto.NotificationsDTO;
import com.cts.mrfp.carrygo.service.NotificationsService;
import com.cts.mrfp.carrygo.util.DTOConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationsController {

    @Autowired
    private NotificationsService notificationsService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<NotificationsDTO>> getUserNotifications(@PathVariable Integer userId) {
        List<Notifications> notifications = notificationsService.getUserNotifications(userId);
        List<NotificationsDTO> dtos = notifications.stream()
            .map(DTOConverter::convertNotificationsToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<NotificationsDTO> sendNotification(@RequestBody NotificationsDTO notificationDTO) {
        Notifications notification = new Notifications();
        notification.setType(notificationDTO.getType());
        notification.setMessage(notificationDTO.getMessage());
        notification.setIsRead(Boolean.TRUE.equals(notificationDTO.getIsRead()));
        
        Notifications sent = notificationsService.sendNotification(notification);
        return ResponseEntity.ok(DTOConverter.convertNotificationsToDTO(sent));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Integer id) {
        notificationsService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }
}