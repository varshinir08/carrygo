package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Services;
import com.cts.mrfp.carrygo.repository.ServiceRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ServicesService {

    @Autowired
    private ServiceRepository servicesRepository;

    public List<Services> getAllServices() {
        return servicesRepository.findAll();
    }

    public Services createService(Services service) {
        return servicesRepository.save(service);
    }

    public Optional<Services> getServiceById(Integer id) {
        return servicesRepository.findById(id);
    }

    public Services updateService(Integer id, Services serviceDetails) {
        return servicesRepository.findById(id).map(service -> {
            service.setService_name(serviceDetails.getService_name());
            service.setDescription(serviceDetails.getDescription());
            service.setIs_active(serviceDetails.getIs_active());
            return servicesRepository.save(service);
        }).orElseThrow(() -> new RuntimeException("Service not found with id " + id));
    }

    public void deleteService(Integer id) {
        servicesRepository.deleteById(id);
    }
}