package com.bragas.api;

import org.springframework.boot.SpringApplication;

public class TestBragasApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(BragasApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
