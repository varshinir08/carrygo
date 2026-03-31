package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Services;
import com.cts.mrfp.carrygo.service.ServicesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/services")
@CrossOrigin(origins = "*")
public class ServicesController {

    @Autowired
    private ServicesService servicesService;

    @GetMapping
    public List<Services> getAllServices() {
        return servicesService.getAllServices();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Services> getServiceById(@PathVariable Integer id) {
        return servicesService.getServiceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Services> createService(@RequestBody Services service) {
        return ResponseEntity.ok(servicesService.createService(service));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Services> updateService(@PathVariable Integer id, @RequestBody Services serviceDetails) {
        try {
            return ResponseEntity.ok(servicesService.updateService(id, serviceDetails));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteService(@PathVariable Integer id) {
        servicesService.deleteService(id);
        return ResponseEntity.noContent().build();
    }

}
