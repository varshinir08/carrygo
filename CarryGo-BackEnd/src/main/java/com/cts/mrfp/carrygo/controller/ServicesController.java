package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Services;
import com.cts.mrfp.carrygo.dto.ServicesDTO;
import com.cts.mrfp.carrygo.service.ServicesService;
import com.cts.mrfp.carrygo.util.DTOConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/services")
@CrossOrigin(origins = "*")
public class ServicesController {

    @Autowired
    private ServicesService servicesService;

    @GetMapping
    public List<ServicesDTO> getAllServices() {
        List<Services> services = servicesService.getAllServices();
        return services.stream().map(DTOConverter::convertServicesToDTO).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServicesDTO> getServiceById(@PathVariable Integer id) {
        return servicesService.getServiceById(id)
                .map(service -> ResponseEntity.ok(DTOConverter.convertServicesToDTO(service)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ServicesDTO> createService(@RequestBody ServicesDTO serviceDTO) {
        Services service = DTOConverter.convertDTOToServices(serviceDTO);
        Services created = servicesService.createService(service);
        return ResponseEntity.ok(DTOConverter.convertServicesToDTO(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServicesDTO> updateService(@PathVariable Integer id, @RequestBody ServicesDTO serviceDetailsDTO) {
        try {
            Services serviceDetails = DTOConverter.convertDTOToServices(serviceDetailsDTO);
            Services updated = servicesService.updateService(id, serviceDetails);
            return ResponseEntity.ok(DTOConverter.convertServicesToDTO(updated));
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
