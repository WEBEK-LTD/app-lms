-- 184.6 The in-app call: each call's WebRTC offer and answer on contact_calls (kept only until it ends), and an iPhone's PushKit token on hosted_devices for calls that ring with the app closed.
ALTER TABLE `contact_calls` ADD `offer_sdp` text;--> statement-breakpoint
ALTER TABLE `contact_calls` ADD `answer_sdp` text;--> statement-breakpoint
ALTER TABLE `hosted_devices` ADD `voip_token` varchar(200);