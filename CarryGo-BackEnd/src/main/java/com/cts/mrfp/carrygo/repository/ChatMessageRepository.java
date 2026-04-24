package com.cts.mrfp.carrygo.repository;

import com.cts.mrfp.carrygo.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByDeliveryIdOrderBySentAtAsc(Integer deliveryId);
}
