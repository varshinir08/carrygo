package com.cts.mrfp.carrygo.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.cts.mrfp.carrygo.model.Transactions;
import java.util.List;
 
public interface TransactionsRepository extends JpaRepository<Transactions, Integer> {
    List<Transactions> findByWalletWalletId(Integer walletId);
}