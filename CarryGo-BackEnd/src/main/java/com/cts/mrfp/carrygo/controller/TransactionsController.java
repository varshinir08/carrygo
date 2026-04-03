package com.cts.mrfp.carrygo.controller;
 
import com.cts.mrfp.carrygo.model.Transactions;
import com.cts.mrfp.carrygo.dto.TransactionsDTO;
import com.cts.mrfp.carrygo.service.TransactionsService;
import com.cts.mrfp.carrygo.util.DTOConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
 
import java.util.List;
import java.util.stream.Collectors;
 
@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionsController {
 
    @Autowired
    private TransactionsService transactionsService;
 
    @PostMapping
    public ResponseEntity<TransactionsDTO> createTransaction(@RequestBody TransactionsDTO transactionDTO) {
        Transactions transaction = new Transactions();
        transaction.setType(transactionDTO.getType());
        transaction.setAmount(transactionDTO.getAmount());
        transaction.setStatus(transactionDTO.getStatus());
        
        Transactions created = transactionsService.createTransaction(transaction);
        return ResponseEntity.ok(DTOConverter.convertTransactionsToDTO(created));
    }
 
    @GetMapping("/wallet/{walletId}")
    public ResponseEntity<List<TransactionsDTO>> getTransactionsByWallet(@PathVariable Integer walletId) {
        List<Transactions> transactions = transactionsService.getTransactionsByWallet(walletId);
        List<TransactionsDTO> dtos = transactions.stream()
            .map(DTOConverter::convertTransactionsToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
 
    @GetMapping
    public List<TransactionsDTO> getAllTransactions() {
        List<Transactions> transactions = transactionsService.getAllTransactions();
        return transactions.stream()
            .map(DTOConverter::convertTransactionsToDTO)
            .collect(Collectors.toList());
    }
}