package com.cts.mrfp.carrygo.controller;
 
import com.cts.mrfp.carrygo.model.Transactions;
import com.cts.mrfp.carrygo.service.TransactionsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
 
import java.util.List;
 
@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionsController {
 
    @Autowired
    private TransactionsService transactionsService;
 
    @PostMapping
    public ResponseEntity<Transactions> createTransaction(@RequestBody Transactions transaction) {
        return ResponseEntity.ok(transactionsService.createTransaction(transaction));
    }
 
    @GetMapping("/wallet/{walletId}")
    public ResponseEntity<List<Transactions>> getTransactionsByWallet(@PathVariable Integer walletId) {
        return ResponseEntity.ok(transactionsService.getTransactionsByWallet(walletId));
    }
 
    @GetMapping
    public List<Transactions> getAllTransactions() {
        return transactionsService.getAllTransactions();
    }
}