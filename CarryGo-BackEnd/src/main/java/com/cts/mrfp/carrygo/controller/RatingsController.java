package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Ratings;
import com.cts.mrfp.carrygo.dto.RatingsDTO;
import com.cts.mrfp.carrygo.service.RatingsService;
import com.cts.mrfp.carrygo.util.DTOConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ratings")
@CrossOrigin(origins = "*")
public class RatingsController {

    @Autowired
    private RatingsService ratingsService;

    @PostMapping
    public ResponseEntity<RatingsDTO> addRating(@RequestBody RatingsDTO ratingDTO) {
        Ratings rating = new Ratings();
        rating.setRating(ratingDTO.getRating());
        rating.setComment(ratingDTO.getComment());
        
        Ratings added = ratingsService.addRating(rating);
        return ResponseEntity.ok(DTOConverter.convertRatingsToDTO(added));
    }

    @GetMapping("/commuter/{commuterId}")
    public ResponseEntity<List<RatingsDTO>> getCommuterRatings(@PathVariable Integer commuterId) {
        List<Ratings> ratings = ratingsService.getRatingsByCommuter(commuterId);
        List<RatingsDTO> dtos = ratings.stream()
            .map(DTOConverter::convertRatingsToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
}