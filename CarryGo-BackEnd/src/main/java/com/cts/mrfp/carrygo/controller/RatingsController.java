package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.dto.RatingsDTO;
import com.cts.mrfp.carrygo.model.Ratings;
import com.cts.mrfp.carrygo.service.RatingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ratings")
@CrossOrigin(origins = "*")
public class RatingsController {

    @Autowired
    private RatingsService ratingsService;

    @PostMapping
    public ResponseEntity<?> addRating(@RequestBody RatingsDTO ratingDTO) {
        if (ratingDTO.getDeliveryId() == null
                || ratingDTO.getSenderId()   == null
                || ratingDTO.getCommuterId() == null
                || ratingDTO.getRating()     == null) {
            return ResponseEntity.badRequest().body("Missing required fields");
        }

        try {
            Ratings added = ratingsService.addRating(ratingDTO);
            ratingDTO.setRatingId(added.getRatingId());
            ratingDTO.setCreatedAt(added.getCreatedAt());

            // Best-effort: update the commuter's average rating.
            // If this fails (e.g. schema not yet migrated) the rating is already saved.
            try {
                ratingsService.updateCommuterAvgRating(ratingDTO.getCommuterId());
            } catch (Exception ignored) {}

            return ResponseEntity.ok(ratingDTO);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to save rating: " + e.getMessage());
        }
    }

    @GetMapping("/commuter/{commuterId}")
    public ResponseEntity<List<RatingsDTO>> getCommuterRatings(@PathVariable Integer commuterId) {
        return ResponseEntity.ok(ratingsService.getRatingsByCommuter(commuterId));
    }

    @GetMapping("/commuter/{commuterId}/average")
    public ResponseEntity<Map<String, Object>> getAvgRating(@PathVariable Integer commuterId) {
        Double avg = ratingsService.getAvgRating(commuterId);
        return ResponseEntity.ok(Map.of("avgRating", avg != null ? avg : 0.0));
    }

    @GetMapping("/delivery/{deliveryId}/exists")
    public ResponseEntity<Map<String, Boolean>> isDeliveryRated(@PathVariable Integer deliveryId) {
        boolean rated = ratingsService.isDeliveryRated(deliveryId);
        return ResponseEntity.ok(Map.of("rated", rated));
    }
}
