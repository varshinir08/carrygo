package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Notifications;
import com.cts.mrfp.carrygo.service.NotificationsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationsController {

    @Autowired
    private NotificationsService notificationsService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notifications>> getUserNotifications(@PathVariable Integer userId) {
        return ResponseEntity.ok(notificationsService.getUserNotifications(userId));
    }

    @PostMapping
    public ResponseEntity<Notifications> sendNotification(@RequestBody Notifications notification) {
        return ResponseEntity.ok(notificationsService.sendNotification(notification));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Integer id) {
        notificationsService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }
}