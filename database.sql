DROP TABLE IF EXISTS `access_settings`;

CREATE TABLE `access_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `user_id` int NOT NULL,
  `can_access` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `access_settings_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`),
  CONSTRAINT `access_settings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) AUTO_INCREMENT=37;



LOCK TABLES `access_settings` WRITE;

INSERT INTO `access_settings` VALUES (1,19,3,1),(5,17,1,1),(36,17,3,0);

UNLOCK TABLES;



DROP TABLE IF EXISTS `comments`;

CREATE TABLE `comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `user_id` int NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `user_id` (`user_id`),
  FULLTEXT KEY `content` (`content`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`),
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) AUTO_INCREMENT=5;


LOCK TABLES `comments` WRITE;

INSERT INTO `comments` VALUES (1,15,2,'Nice','2024-10-10 14:36:59'),(2,1,2,'Great!','2024-10-11 05:22:38'),(3,5,2,'Good!','2024-10-11 14:16:11'),(4,5,2,'Very Good!','2024-10-11 14:19:48');

UNLOCK TABLES;


DROP TABLE IF EXISTS `form_responses`;

CREATE TABLE `form_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `form_id` int DEFAULT NULL,
  `response_data` json DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) AUTO_INCREMENT=13;


LOCK TABLES `form_responses` WRITE;

INSERT INTO `form_responses` VALUES (1,2,13,'{\"13\": \"hh\"}','2024-10-04 13:29:24'),(2,2,13,'{\"13\": \"hh\"}','2024-10-04 13:33:37'),(3,2,13,'{\"13\": \"gg\"}','2024-10-04 13:35:50'),(4,2,10,'{\"4\": \"sample answer 2\"}','2024-10-04 13:52:01'),(5,3,14,'{\"16\": \"26\", \"17\": \"\\\"value\\\":\\\"25-30K\\\"}\"}','2024-10-06 14:27:49'),(6,2,13,'{\"18\": \"A process to check the ability.\"}','2024-10-06 14:49:31'),(7,3,15,'{\"19\": \"25k\", \"20\": \"26-30\"}','2024-10-06 14:53:17'),(8,3,15,'{\"21\": \"30k\", \"22\": \"26-30\"}','2024-10-08 14:23:26'),(9,2,17,'{\"70\": \"Monday\"}','2024-10-13 06:01:51'),(10,3,17,'{\"70\": \"Monday\"}','2024-10-13 06:02:36'),(11,3,19,'{\"77\": \"30000\", \"78\": \"2\"}','2024-10-13 13:51:06'),(12,3,19,'{\"79\": \"30000\", \"80\": \"2\"}','2024-10-15 14:35:03');

UNLOCK TABLES;



DROP TABLE IF EXISTS `forms`;

CREATE TABLE `forms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `answers` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `forms_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forms_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);


LOCK TABLES `forms` WRITE;

UNLOCK TABLES;



DROP TABLE IF EXISTS `likes`;

CREATE TABLE `likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`),
  CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) AUTO_INCREMENT=15;



LOCK TABLES `likes` WRITE;

INSERT INTO `likes` VALUES (1,17,2),(3,15,2),(5,1,2),(6,14,2),(7,16,2),(8,3,2),(11,4,2),(12,5,2),(13,16,3),(14,1,1);

UNLOCK TABLES;


DROP TABLE IF EXISTS `questions`;

CREATE TABLE `questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int DEFAULT NULL,
  `value` varchar(255) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `options` text,
  `is_required` tinyint(1) DEFAULT '0',
  `showQuestion` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  FULLTEXT KEY `value` (`value`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE
)AUTO_INCREMENT=123;


LOCK TABLES `questions` WRITE;

INSERT INTO `questions` VALUES (3,9,'What is your name?','text',NULL,0,1),(5,11,'What is your name? (Sample question 1)','text','',0,1),(6,11,'What is your favorite color? (Sample question 2)','radio','Orange, Blue, Red, Green',0,1),(7,12,'Do you agree?','checkbox','Yes, no',0,1),(16,14,'Your age?','number','\"\"',0,1),(17,14,'Expected salary range?','radio','[{\"label\":\"25-30K\",\"value\":\"25-30K\"},{\"label\":\"30-45K\",\"value\":\"30-45K\"}]',0,1),(21,15,'What is your salary range?','text','\"\"',0,1),(22,15,'Your age?','radio','[{\"label\":\"22-25\",\"value\":\"22-25\"},{\"label\":\"26-30\",\"value\":\"26-30\"}]',0,1),(23,16,'What is your favorite color?','radio','\"Red, Green, Blue, Yellow\"',0,1),(31,13,'What is test?','text','\"\\\"\\\\\\\"\\\\\\\"\\\"\"',0,1),(71,18,'Expected salary range?','number','\"\"',0,1),(72,18,'Experience?','radio','\"1,2,3,4\"',0,1),(82,17,'What is your name? (Sunday, Monday)','radio','[{\"label\":\"Sunday\",\"value\":\"Sunday\"},{\"label\":\"Monday\",\"value\":\"Monday\"}]',0,1),(85,20,'What does education mean?','text',NULL,0,1),(86,1,'What is your name?','text',NULL,0,1),(87,1,'What is your age?','number',NULL,0,1),(89,10,'Sample question','radio','[{\"label\":\"sample answer 1\",\"value\":\"sample answer 1\"},{\"label\":\"sample answer 2\",\"value\":\"sample answer 2\"}]',0,1),(98,19,'Expected salary range?','number',NULL,0,1),(99,19,'Experience?','radio','[{\"label\":\"1\",\"value\":\"1\"},{\"label\":\"2\",\"value\":\"2\"},{\"label\":\"3\",\"value\":\"3\"}]',0,1),(112,2,'Sample question?','text',NULL,0,1),(113,2,'Sample question 2?','radio','[{\"label\":\"a\",\"value\":\"a\"},{\"label\":\"b\",\"value\":\"b\"}]',0,1),(120,23,'What is 2+2?','text',NULL,0,1),(121,23,'What is 3+3?','radio','[{\"label\":\"6\",\"value\":\"6\"},{\"label\":\"9\",\"value\":\"9\"}]',0,0),(122,22,'Sample Question.','text',NULL,0,1);

UNLOCK TABLES;



DROP TABLE IF EXISTS `templates`;

CREATE TABLE `templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `topic` varchar(255) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tags` text,
  `image_url` varchar(255) DEFAULT NULL,
  `likes_count` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  FULLTEXT KEY `title` (`title`,`description`),
  CONSTRAINT `templates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) AUTO_INCREMENT=24;




LOCK TABLES `templates` WRITE;

INSERT INTO `templates` VALUES (1,'Reactblog','jjj','Education',NULL,'2024-10-02 05:33:55','[\"aa\"]',NULL,2),(2,'React','Hello','Education',NULL,'2024-10-02 13:50:02','[\"react\",\"js\"]',NULL,0),(3,'JavaScript','Question about javaScript',NULL,NULL,'2024-10-02 14:16:48','[\"\"]',NULL,1),(4,'JavaScript','Question about javaScript',NULL,NULL,'2024-10-02 14:17:06','[\"js\",\"arrow\"]',NULL,1),(5,'JavaScript','Question about javaScript',NULL,NULL,'2024-10-02 14:17:26','[\"js\",\"arrow\"]',NULL,1),(6,'JavaScript','Question about javaScript',NULL,NULL,'2024-10-02 14:17:28','[\"js\",\"arrow\"]',NULL,0),(9,'Simple Question','Users can create single line question with this template.',NULL,NULL,'2024-10-03 04:50:57','[\"question\",\"single-line\"]',NULL,0),(10,'Quiz-template','Users can create quiz forms using this template.','Quiz',NULL,'2024-10-03 05:10:53','[\"quiz\",\"form\",\"mcq\"]',NULL,0),(11,'Enter Title','Enter Description',NULL,NULL,'2024-10-03 13:54:58','[\"quiz\",\"form\",\"mcq\"]',NULL,0),(12,'Form','Form-description',NULL,NULL,'2024-10-04 05:49:47','[\"form\"]',NULL,0),(13,'Title','test-template',NULL,2,'2024-10-04 13:12:46','[\"test\",\"template\",\"more\"]',NULL,0),(14,'Job queries','Questions about job.',NULL,3,'2024-10-06 14:26:22','[\"job\",\"form\",\"mcq\"]',NULL,1),(15,'Job queries 2','More templates',NULL,3,'2024-10-06 14:52:54','[\"job\",\"form\",\"mcq\"]',NULL,1),(16,'Sample-test','Quiz test',NULL,2,'2024-10-09 05:28:59','\"quiz,form,mcq\"',NULL,2),(17,'Sample-test','Quiz test',NULL,2,'2024-10-09 05:38:53','[\"quiz\",\"form\",\"mcq\",\"template\"]','https://res.cloudinary.com/dyaxirssq/image/upload/v1728539219/hyw22cgfkjtojhatyexe.png',1),(18,'Job query 3','More template on job queries',NULL,3,'2024-10-13 05:50:57','\"job queries,form\"','https://res.cloudinary.com/dyaxirssq/image/upload/v1728798607/jlhmvz5cfzvrj9igjny0.png',0),(19,'Job query 3','More template on job queries','Other',3,'2024-10-13 05:52:02','[\"job query\",\"form\"]','https://res.cloudinary.com/dyaxirssq/image/upload/v1729088294/yhnsajtn9fblcknel0wx.png',0),(20,'Education','Related questions','Education',2,'2024-10-16 05:27:01','[\"Education\",\"question\"]','https://res.cloudinary.com/dyaxirssq/image/upload/v1729056369/vxlloz05wtcwxnfjux6l.png',0),(22,'Exam questions 2','Questions related to exam.','Education',1,'2024-10-18 04:59:26','[]','https://res.cloudinary.com/dyaxirssq/image/upload/v1729227513/i95bfcothc9l7hghrsai.png',0),(23,'Exam questions','Questions related to exam.','Education',1,'2024-10-18 05:06:21','[]','https://res.cloudinary.com/dyaxirssq/image/upload/v1729255371/kcivoessqvqnx1hz4kct.png',0);

UNLOCK TABLES;



DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) AUTO_INCREMENT=1;



LOCK TABLES `users` WRITE;

INSERT INTO `users` VALUES (1,'Deena','deenafaria@gmail.com','$2b$10$bgLOBQrIZEJvjgyqUNjZnOK66DeJYdqfCFqfMuelOwBjE0bEd4j26',1,'2024-10-01 06:00:26',0),(2,'Shuvro','shuvro@gmail.com','$2b$10$db4Uwo7.hEJYYWAEmRnJue4HYP5ummg7WuagOTsJCjLhdHE5QIPMW',0,'2024-10-01 06:01:16',0),(3,'Antu','antu@gmail.com','$2b$10$3YRe1806xl1nGySbDRtw/O4aANEJNJ5OSUtVB7ruLeSzsS.O5tJeq',0,'2024-10-02 14:19:10',0),(4,'John','john@gmail.com','$2b$10$wQl1jWdWWf0T0xTR1wNX4e67sKZPjh98jjH3c2V3e1YBNTQNvBUua',0,'2024-10-15 04:40:48',1);

UNLOCK TABLES;
