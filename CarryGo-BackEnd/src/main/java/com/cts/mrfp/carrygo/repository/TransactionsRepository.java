package com.cts.mrfp.carrygo.repository;
import com.cts.mrfp.carrygo.model.Transactions;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
 
public interface TransactionsRepository extends JpaRepository<Transactions, Integer> {
    List<Transactions> findByWalletWalletId(Integer walletId);
}