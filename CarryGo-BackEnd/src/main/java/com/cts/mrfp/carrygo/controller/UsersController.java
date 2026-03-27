package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins="https://localhost:4200")
public class UsersController {

    @Autowired
    private UsersService usersService;
    public UsersController(UsersService usersService)
    {
        this.usersService=usersService;
    }
    @PostMapping
    public Users insert(@RequestBody Users users)
    {
        return usersService.insert(users);
    }
}
