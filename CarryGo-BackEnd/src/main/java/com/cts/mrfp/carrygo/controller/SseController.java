package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.service.SseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/sse")
public class SseController {

    @Autowired private SseService sseService;

    /**
     * Clients connect here to receive real-time events.
     * EventSource in browser: new EventSource('http://localhost:8081/api/sse/subscribe/123')
     */
    @GetMapping(value = "/subscribe/{userId}", produces = "text/event-stream")
    public SseEmitter subscribe(
            @PathVariable Integer userId,
            @RequestHeader(name = "Origin", required = false, defaultValue = "") String origin) {

        SseEmitter emitter = sseService.subscribe(userId);

        // CORS must be set on the response — Spring MVC SseEmitter bypasses @CrossOrigin
        // so we set it manually in the response headers below.
        // The actual header injection is handled by CorsConfig WebMvcConfigurer globally.
        return emitter;
    }
}
