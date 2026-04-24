package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.dto.ChatMessageDTO;
import com.cts.mrfp.carrygo.model.ChatMessage;
import com.cts.mrfp.carrygo.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatService {

    @Autowired private ChatMessageRepository repo;
    @Autowired private WebSocketMessagingService wsService;

    public ChatMessageDTO send(Integer deliveryId, Integer senderId,
                               String senderName, String senderRole, String message) {
        ChatMessage msg = new ChatMessage();
        msg.setDeliveryId(deliveryId);
        msg.setSenderId(senderId);
        msg.setSenderName(senderName);
        msg.setSenderRole(senderRole);
        msg.setMessage(message);
        msg.setSentAt(LocalDateTime.now());
        ChatMessageDTO dto = toDTO(repo.save(msg));
        wsService.pushToChat(deliveryId, dto);
        return dto;
    }

    public List<ChatMessageDTO> getHistory(Integer deliveryId) {
        return repo.findByDeliveryIdOrderBySentAtAsc(deliveryId)
                   .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public ChatMessageDTO toDTO(ChatMessage m) {
        ChatMessageDTO d = new ChatMessageDTO();
        d.setId(m.getId());
        d.setDeliveryId(m.getDeliveryId());
        d.setSenderId(m.getSenderId());
        d.setSenderName(m.getSenderName());
        d.setSenderRole(m.getSenderRole());
        d.setMessage(m.getMessage());
        d.setSentAt(m.getSentAt());
        return d;
    }
}
