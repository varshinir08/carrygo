package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.dto.FareEstimateRequest;
import com.cts.mrfp.carrygo.dto.FareEstimateResponse;
import com.cts.mrfp.carrygo.service.FareService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fare")
@CrossOrigin(origins = "*")
public class FareController {

    @Autowired private FareService fareService;

    @PostMapping("/estimate")
    public ResponseEntity<FareEstimateResponse> estimate(
            @RequestBody FareEstimateRequest req) {
        return ResponseEntity.ok(fareService.estimate(req));
    }
}
