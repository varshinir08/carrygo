package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UsersService {


    private UsersRepository usersRepository;
    @Autowired
    public UsersService(UsersRepository usersRepository)
    {
        this.usersRepository=usersRepository;
    }
    public Users insert(Users users)
    {
        return usersRepository.save(users);
    }
}
