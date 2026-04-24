package com.cts.mrfp.carrygo.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class WebSocketMessagingService {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketMessagingService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /** Broadcast a new ride request to ALL connected porters. */
    public void pushToPorters(String eventName, Object payload) {
        messagingTemplate.convertAndSend("/topic/new-orders", (Object) wrap(eventName, payload));
    }

    /** Send a personal event to a specific user (sender or porter). */
    public void push(Integer userId, String eventName, Object payload) {
        messagingTemplate.convertAndSend("/topic/user/" + userId, (Object) wrap(eventName, payload));
    }

    /** Broadcast a chat message to both parties in a delivery chat room. */
    public void pushToChat(Integer deliveryId, Object payload) {
        messagingTemplate.convertAndSend("/topic/chat/" + deliveryId, (Object) wrap("chatMessage", payload));
    }

    private Map<String, Object> wrap(String eventName, Object payload) {
        Map<String, Object> msg = new LinkedHashMap<>();
        msg.put("event", eventName);
        msg.put("data", payload);
        return msg;
    }
}
