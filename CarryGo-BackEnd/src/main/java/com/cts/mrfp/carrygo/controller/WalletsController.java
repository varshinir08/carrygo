package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Wallets;
import com.cts.mrfp.carrygo.dto.WalletsDTO;
import com.cts.mrfp.carrygo.service.WalletsService;
import com.cts.mrfp.carrygo.util.DTOConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/wallets")
@CrossOrigin(origins = "*")
public class WalletsController {

    @Autowired private WalletsService walletService;

    @GetMapping("/user/{userId}")
    public WalletsDTO getWalletBalance(@PathVariable Integer userId) {
        Wallets wallet = walletService.getWalletByUserId(userId);
        return DTOConverter.convertWalletsToDTO(wallet);
    }

    @PostMapping("/user/{userId}/topup")
    public WalletsDTO topUp(@PathVariable Integer userId, @RequestBody Map<String, Object> body) {
        Float amount = ((Number) body.get("amount")).floatValue();
        Wallets wallet = walletService.topUp(userId, amount);
        return DTOConverter.convertWalletsToDTO(wallet);
    }

    @PostMapping("/user/{userId}/deduct")
    public WalletsDTO deduct(@PathVariable Integer userId, @RequestBody Map<String, Object> body) {
        Float amount = ((Number) body.get("amount")).floatValue();
        Wallets wallet = walletService.deduct(userId, amount);
        return DTOConverter.convertWalletsToDTO(wallet);
    }
}
