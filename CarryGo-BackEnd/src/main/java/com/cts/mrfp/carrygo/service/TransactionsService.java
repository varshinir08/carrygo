package com.cts.mrfp.carrygo.service;
 
import com.cts.mrfp.carrygo.model.Transactions;
import com.cts.mrfp.carrygo.repository.TransactionsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
 
import java.time.LocalDateTime;
import java.util.List;
 
@Service
public class TransactionsService {
 
    @Autowired
    private TransactionsRepository transactionsRepository;
 
    public Transactions createTransaction(Transactions transaction) {
        transaction.setCreatedAt(LocalDateTime.now());
        return transactionsRepository.save(transaction);
    }
 
    public List<Transactions> getTransactionsByWallet(Integer walletId) {
        return transactionsRepository.findByWalletWalletId(walletId);
    }
 
    public List<Transactions> getAllTransactions() {
        return transactionsRepository.findAll();
    }
}