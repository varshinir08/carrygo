package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.dto.FareEstimateRequest;
import com.cts.mrfp.carrygo.dto.FareEstimateResponse;
import com.cts.mrfp.carrygo.repository.DeliveriesRepository;
import com.cts.mrfp.carrygo.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.Map;

@Service
public class FareService {

    @Autowired private DeliveriesRepository deliveriesRepo;
    @Autowired private UsersRepository usersRepo;

    // Base rates per vehicle type: [baseFare, perKm, perMin]
    private static final Map<String, float[]> BASE_RATES = Map.of(
        "bike",  new float[]{15,  8f,  0.5f},
        "auto",  new float[]{25, 12f,  1.0f},
        "mini",  new float[]{40, 14f,  1.5f},
        "sedan", new float[]{60, 18f,  2.0f},
        "suv",   new float[]{80, 22f,  2.5f}
    );

    // Premium zones: [minLat, maxLat, minLng, maxLng, surcharge]
    // These cover major Indian airports and hubs as rough bounding boxes
    private static final float[][] PREMIUM_ZONES = {
        // Delhi IGI Airport area
        {28.53f, 28.59f, 77.06f, 77.12f, 60f},
        // Mumbai Chhatrapati Shivaji Airport
        {19.08f, 19.12f, 72.85f, 72.90f, 60f},
        // Bangalore Kempegowda Airport
        {13.18f, 13.22f, 77.69f, 77.73f, 80f},
        // Hyderabad Rajiv Gandhi Airport
        {17.22f, 17.26f, 78.42f, 78.47f, 60f},
        // Chennai Airport
        {12.98f, 13.02f, 80.16f, 80.19f, 50f},
        // Pune Airport
        {18.57f, 18.60f, 73.89f, 73.92f, 30f},
        // Kolkata Airport
        {22.64f, 22.68f, 88.44f, 88.46f, 50f},
    };

    public FareEstimateResponse estimate(FareEstimateRequest req) {
        String vt = (req.getVehicleType() == null) ? "auto"
                    : req.getVehicleType().toLowerCase();
        float[] rates = BASE_RATES.getOrDefault(vt, BASE_RATES.get("auto"));

        // Distance
        float distKm = haversineKm(req.getPickupLat(), req.getPickupLng(),
                                    req.getDropLat(),  req.getDropLng());

        // Speed assumption: 30 km/h average
        int estimatedMinutes = Math.max(5, Math.round(distKm / 30f * 60));

        // Fare components (pre-surge/multiplier)
        float baseFare     = rates[0];
        float distanceFare = rates[1] * distKm;
        float timeFare     = rates[2] * estimatedMinutes;

        // Time-of-day multiplier
        int hour = LocalTime.now().getHour();
        float timeMultiplier = 1.0f;
        if (hour >= 8  && hour <= 10) timeMultiplier = 1.3f;
        else if (hour >= 18 && hour <= 21) timeMultiplier = 1.3f;
        else if (hour >= 23 || hour <= 5)  timeMultiplier = 1.2f;

        // Demand-based surge
        float surgeMultiplier = computeSurge(req.getPickupLat(), req.getPickupLng());
        float combinedMultiplier = surgeMultiplier * timeMultiplier;

        String surgeLabel = getSurgeLabel(combinedMultiplier);

        // Zone surcharge
        float zoneSurcharge = computeZoneSurcharge(
            req.getPickupLat(), req.getPickupLng(),
            req.getDropLat(),   req.getDropLng());

        // Total
        float subtotal = (baseFare + distanceFare + timeFare) * combinedMultiplier;
        float total    = Math.round((subtotal + zoneSurcharge) * 10f) / 10f;

        // ±5% fare range
        int lo = (int) Math.floor(total * 0.95);
        int hi = (int) Math.ceil(total  * 1.05);

        FareEstimateResponse resp = new FareEstimateResponse();
        resp.setBaseFare(Math.round(baseFare * 10f) / 10f);
        resp.setDistanceFare(Math.round(distanceFare * combinedMultiplier * 10f) / 10f);
        resp.setTimeFare(Math.round(timeFare * combinedMultiplier * 10f) / 10f);
        resp.setSurgeMultiplier(Math.round(combinedMultiplier * 100f) / 100f);
        resp.setSurgeLabel(surgeLabel);
        resp.setZoneSurcharge(zoneSurcharge);
        resp.setTotalFare(total);
        resp.setFareRange("₹" + lo + " – ₹" + hi);
        resp.setDistanceKm(Math.round(distKm * 10f) / 10f);
        resp.setEstimatedMinutes(estimatedMinutes);
        resp.setHasSurge(combinedMultiplier > 1.3f);
        return resp;
    }

    private float computeSurge(Float pickupLat, Float pickupLng) {
        long activeRequests = deliveriesRepo.findByStatus("PENDING").size();
        long onlinePorters  = usersRepo.findByIsOnlineTrue().stream()
                .filter(u -> u.getRole() != null && u.getRole().contains("porter"))
                .count();

        if (onlinePorters == 0) return 2.0f;
        double ratio = (double) activeRequests / onlinePorters;

        if (ratio < 1.2) return 1.0f;
        if (ratio < 1.5) return 1.2f;
        if (ratio < 2.0) return 1.5f;
        if (ratio < 3.0) return 1.8f;
        return 2.0f;
    }

    private float computeZoneSurcharge(Float pLat, Float pLng, Float dLat, Float dLng) {
        if (pLat == null || dLat == null) return 0;
        for (float[] z : PREMIUM_ZONES) {
            boolean pickupIn = pLat >= z[0] && pLat <= z[1] && pLng >= z[2] && pLng <= z[3];
            boolean dropIn   = dLat >= z[0] && dLat <= z[1] && dLng >= z[2] && dLng <= z[3];
            if (pickupIn || dropIn) return z[4];
        }
        return 0;
    }

    private String getSurgeLabel(float multiplier) {
        if (multiplier <= 1.0f) return "Normal";
        if (multiplier <= 1.3f) return "Slight Demand";
        if (multiplier <= 1.5f) return "High Demand";
        if (multiplier <= 1.8f) return "Very High Demand";
        return "Surge Pricing";
    }

    private float haversineKm(Float lat1, Float lng1, Float lat2, Float lng2) {
        if (lat1 == null || lat2 == null) return 5.0f;
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return (float)(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }
}
