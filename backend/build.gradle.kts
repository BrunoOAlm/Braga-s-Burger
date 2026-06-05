plugins {
	java
	id("org.springframework.boot") version "4.0.6"
	id("io.spring.dependency-management") version "1.1.7"
}

buildscript {
	repositories { mavenCentral() }
	dependencies {
		classpath("org.springframework.security:spring-security-crypto:7.0.5")
		classpath("commons-logging:commons-logging:1.3.6")
	}
}

group = "com.bragas"
version = "0.0.1-SNAPSHOT"
description = "Backend de pedidos do Braga's Burger"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springframework.boot:spring-boot-starter-mail")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("com.github.f4b6a3:ulid-creator:5.2.3")
	implementation("net.logstash.logback:logstash-logback-encoder:7.4")
	implementation("io.jsonwebtoken:jjwt-api:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
	implementation("com.bucket4j:bucket4j-core:8.10.1")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testImplementation("com.icegreen:greenmail-junit5:2.1.0")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

tasks.register("bcryptHash") {
	description = "Generate a bcrypt hash for a password. Usage: ./gradlew bcryptHash -Ppassword=YOUR_PASSWORD"
	group = "verification"
	doLast {
		val pwd = (project.findProperty("password") as String?)
			?: throw GradleException("Missing -Ppassword=YOUR_PASSWORD")
		val encoder = org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(10)
		println(encoder.encode(pwd))
	}
}

tasks.register("bcryptVerify") {
	description = "Verify a bcrypt hash matches a password. Usage: ./gradlew bcryptVerify -Phash=... -Ppassword=..."
	group = "verification"
	doLast {
		val pwd = (project.findProperty("password") as String?)
			?: throw GradleException("Missing -Ppassword=YOUR_PASSWORD")
		val hash = (project.findProperty("hash") as String?)
			?: throw GradleException("Missing -Phash=BCRYPT_HASH")
		val encoder = org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(10)
		println("matches=${encoder.matches(pwd, hash)}")
	}
}
