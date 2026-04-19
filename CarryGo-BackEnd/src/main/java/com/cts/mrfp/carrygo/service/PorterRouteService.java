package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.dto.PorterRouteDTO;
import com.cts.mrfp.carrygo.model.PorterRoute;
import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.repository.PorterRouteRepository;
import com.cts.mrfp.carrygo.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PorterRouteService {

    @Autowired private PorterRouteRepository routeRepo;
    @Autowired private UsersRepository usersRepo;

    public List<PorterRoute> getRoutesByPorter(Integer porterId) {
        return routeRepo.findByPorterUserId(porterId);
    }

    public PorterRoute saveRoute(Integer porterId, PorterRouteDTO dto) {
        Users porter = usersRepo.findById(porterId).orElseThrow();
        PorterRoute route = new PorterRoute();
        route.setPorter(porter);
        route.setFromLocation(dto.getFromLocation());
        route.setFromLat(dto.getFromLat());
        route.setFromLng(dto.getFromLng());
        route.setToLocation(dto.getToLocation());
        route.setToLat(dto.getToLat());
        route.setToLng(dto.getToLng());
        route.setDepartureTime(dto.getDepartureTime());
        route.setIsActive(true);
        route.setCreatedAt(LocalDateTime.now());
        return routeRepo.save(route);
    }

    public void deleteRoute(Integer routeId) {
        routeRepo.deleteById(routeId);
    }

    /** Returns true if the delivery pickup/drop is within threshold km of this route's start/end. */
    public boolean matchesDelivery(PorterRoute route,
                                    Float pickupLat, Float pickupLng,
                                    Float dropLat,   Float dropLng) {
        if (route.getFromLat() == null || route.getToLat() == null) return false;
        double threshold = 5.0; // 5 km
        double fromDist = haversine(route.getFromLat(), route.getFromLng(), pickupLat, pickupLng);
        double toDist   = haversine(route.getToLat(),   route.getToLng(),   dropLat,   dropLng);
        return fromDist <= threshold && toDist <= threshold;
    }

    private double haversine(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
