package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.dto.PorterRouteDTO;
import com.cts.mrfp.carrygo.model.PorterRoute;
import com.cts.mrfp.carrygo.service.PorterRouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/routes")
@CrossOrigin(origins = "*")
public class PorterRouteController {

    @Autowired private PorterRouteService routeService;

    @GetMapping("/{porterId}")
    public ResponseEntity<List<PorterRouteDTO>> getRoutes(@PathVariable Integer porterId) {
        List<PorterRoute> routes = routeService.getRoutesByPorter(porterId);
        return ResponseEntity.ok(routes.stream().map(this::toDTO).collect(Collectors.toList()));
    }

    @PostMapping("/{porterId}")
    public ResponseEntity<?> addRoute(@PathVariable Integer porterId,
                                       @RequestBody PorterRouteDTO dto) {
        try {
            PorterRoute saved = routeService.saveRoute(porterId, dto);
            return ResponseEntity.ok(toDTO(saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{routeId}")
    public ResponseEntity<Void> deleteRoute(@PathVariable Integer routeId) {
        routeService.deleteRoute(routeId);
        return ResponseEntity.noContent().build();
    }

    private PorterRouteDTO toDTO(PorterRoute r) {
        PorterRouteDTO dto = new PorterRouteDTO();
        dto.setRouteId(r.getRouteId());
        dto.setPorterId(r.getPorter().getUserId());
        dto.setFromLocation(r.getFromLocation());
        dto.setFromLat(r.getFromLat());
        dto.setFromLng(r.getFromLng());
        dto.setToLocation(r.getToLocation());
        dto.setToLat(r.getToLat());
        dto.setToLng(r.getToLng());
        dto.setDepartureTime(r.getDepartureTime());
        dto.setIsActive(r.getIsActive());
        return dto;
    }
}
