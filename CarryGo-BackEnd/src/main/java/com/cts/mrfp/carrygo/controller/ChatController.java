package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.dto.ChatMessageDTO;
import com.cts.mrfp.carrygo.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired private ChatService chatService;

    /** Load full message history for a delivery (for both sides on open). */
    @GetMapping("/{deliveryId}")
    public List<ChatMessageDTO> getHistory(@PathVariable Integer deliveryId) {
        return chatService.getHistory(deliveryId);
    }

    /** Send a message; broadcasts to /topic/chat/{deliveryId} via WebSocket. */
    @PostMapping("/{deliveryId}/send")
    public ResponseEntity<?> send(@PathVariable Integer deliveryId,
                                  @RequestBody Map<String, String> body) {
        Integer senderId  = Integer.parseInt(body.getOrDefault("senderId", "0"));
        String senderName = body.getOrDefault("senderName", "User");
        String senderRole = body.getOrDefault("senderRole", "USER");
        String message    = body.getOrDefault("message", "").trim();

        if (message.isEmpty()) return ResponseEntity.badRequest().body("Message cannot be empty");

        ChatMessageDTO dto = chatService.send(deliveryId, senderId, senderName, senderRole, message);
        return ResponseEntity.ok(dto);
    }
}
