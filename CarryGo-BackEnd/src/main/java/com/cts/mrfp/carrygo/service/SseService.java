package com.cts.mrfp.carrygo.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {

    private final ConcurrentHashMap<Integer, SseEmitter> emitters = new ConcurrentHashMap<>();

    /** Subscribe a user for SSE events. Returns the SseEmitter to write to the response. */
    public SseEmitter subscribe(Integer userId) {
        // Timeout = 0 means keep-alive forever; adjust if needed
        SseEmitter emitter = new SseEmitter(0L);

        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId, emitter));
        emitter.onTimeout(()   -> { emitters.remove(userId, emitter); emitter.complete(); });
        emitter.onError(e      -> emitters.remove(userId, emitter));

        // Send initial ping so the connection is established
        try {
            emitter.send(SseEmitter.event().name("ping").data("connected"));
        } catch (IOException ignored) {
            emitters.remove(userId);
        }

        return emitter;
    }

    /** Push a named event with arbitrary payload to a specific user. */
    public void push(Integer userId, String eventName, Object payload) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) return;
        try {
            emitter.send(SseEmitter.event().name(eventName).data(payload));
        } catch (IOException e) {
            emitters.remove(userId, emitter);
        }
    }

}
