package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Ratings;
import com.cts.mrfp.carrygo.service.RatingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@CrossOrigin(origins = "*")
public class RatingsController {

    @Autowired
    private RatingsService ratingsService;

    @PostMapping
    public ResponseEntity<Ratings> addRating(@RequestBody Ratings rating) {
        return ResponseEntity.ok(ratingsService.addRating(rating));
    }

    @GetMapping("/commuter/{commuterId}")
    public ResponseEntity<List<Ratings>> getCommuterRatings(@PathVariable Integer commuterId) {
        return ResponseEntity.ok(ratingsService.getRatingsByCommuter(commuterId));
    }
}