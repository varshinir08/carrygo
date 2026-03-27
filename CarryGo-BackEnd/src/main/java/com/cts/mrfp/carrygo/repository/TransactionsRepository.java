package com.cts.mrfp.carrygo.repository;

import com.cts.mrfp.carrygo.model.Transactions;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionsRepository extends JpaRepository<Transactions,Integer> {
}
