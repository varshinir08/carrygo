package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Transactions;
import com.cts.mrfp.carrygo.model.Wallets;
import com.cts.mrfp.carrygo.service.TransactionsService;
import com.cts.mrfp.carrygo.service.WalletsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallets")
@CrossOrigin(origins = "*")
public class WalletsController {

    @Autowired private WalletsService walletService;
    @Autowired private TransactionsService transactionsService;

    @GetMapping("/user/{userId}")
    public Wallets getWalletBalance(@PathVariable Integer userId) {
        return walletService.getWalletByUserId(userId);
    }


}
