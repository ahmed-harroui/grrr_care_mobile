-- GRRR Care Knowledge Base V1 seed

begin;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('dog','Dog','🐶','mammal',
'["Labrador Retriever", "Golden Retriever", "French Bulldog", "German Shepherd"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('cat','Cat','🐱','mammal',
'["Domestic Shorthair", "British Shorthair", "Persian", "Maine Coon"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('rabbit','Rabbit','🐰','small_mammal',
'["Holland Lop", "Mini Rex", "Netherland Dwarf", "Lionhead"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('guinea_pig','Guinea pig','🐹','small_mammal',
'["American", "Abyssinian", "Peruvian", "Teddy"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('hamster','Hamster','🐹','small_mammal',
'["Syrian", "Dwarf Campbell", "Winter White", "Roborovski"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('mouse','Mouse','🐭','small_mammal',
'["House mouse varieties"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('rat','Rat','🐀','small_mammal',
'["Fancy rat varieties"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('ferret','Ferret','🦦','mustelid',
'["Domestic ferret varieties"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('bird','Pet bird','🐦','bird',
'["Canary", "Finch", "Dove", "Pigeon"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('parrot','Parrot','🦜','bird',
'["Budgerigar", "Cockatiel", "Lovebird", "African Grey", "Conure", "Macaw"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('chicken','Chicken','🐔','bird',
'["Bantam", "Silkie", "Orpington"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('reptile','Reptile','🦎','reptile',
'["Gecko", "Iguana", "Bearded dragon", "Skink"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('snake','Snake','🐍','reptile',
'["Corn snake", "Ball python", "King snake"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('turtle_tortoise','Turtle / tortoise','🐢','reptile',
'["Greek tortoise", "Box turtle", "Red-eared slider"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('amphibian','Amphibian','🐸','amphibian',
'["Frog", "Toad", "Newt", "Axolotl"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('fish','Aquarium fish','🐠','fish',
'["Goldfish", "Betta", "Guppy", "Tetra", "Cichlid"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('horse','Horse','🐴','large_mammal',
'["Arabian", "Quarter Horse", "Thoroughbred"]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_species (id,name,emoji,group_name,common_breeds,supported)
values ('other','Other pet','🐾','other',
'[]'::jsonb,true)
on conflict (id) do update set name=excluded.name, emoji=excluded.emoji, group_name=excluded.group_name,
common_breeds=excluded.common_breeds, supported=excluded.supported;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_overview','Merck Veterinary Manual','Merck & Co., Inc.','veterinary_reference',
'https://www.merckvetmanual.com/resourcespages/about','Veterinarian-authored and reviewed reference covering companion, exotic and other animal health topics.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_preventive','Preventative Health Care for Small Animals','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/management-and-nutrition/preventative-health-care-and-husbandry-in-small-animals/preventative-health-care-for-small-animals','General preventive-care framework for small animals.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_cat_routine','Routine Health Care of Cats','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/cat-owners/caring-for-cats/routine-health-care-of-cats','Cat routine health care and veterinary visit guidance.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_cat_nutrition','Proper Nutrition for Cats','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/cat-owners/selecting-and-providing-a-home-for-a-cat/proper-nutrition-for-cats','Cat nutrition basics.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_reptiles','Management and Husbandry of Reptiles','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/exotic-and-laboratory-animals/reptiles/management-and-husbandry-of-reptiles','Species-specific enclosure, temperature, humidity and diet principles.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_reptile_nutrition','Nutrition in Reptiles','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/management-and-nutrition/nutrition-exotic-and-zoo-animals/nutrition-in-reptiles','Reptile nutrition and husbandry interactions.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_ferret_care','Routine Health Care for Ferrets','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/all-other-pets/ferrets/routine-health-care-for-ferrets','Ferret preventive care, dentistry and vaccination considerations.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_ferret_management','Management of Ferrets','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/exotic-and-laboratory-animals/ferrets/management-of-ferrets','Ferret nutrition and clinical care.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_fish_care','Special Considerations for Fish','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/all-other-pets/fish/special-considerations-for-fish','Aquarium ecosystem, water quality and species-specific needs.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_fish_home','Providing a Home for Fish','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/all-other-pets/fish/providing-a-home-for-fish','Aquarium setup and water-quality basics.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('merck_fish_health','Routine Health Care of Fish','Merck Veterinary Manual','veterinary_reference',
'https://www.merckvetmanual.com/all-other-pets/fish/routine-health-care-of-fish','Fish health management and signs of illness.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('rspca_rabbit_diet','What do rabbits eat?','RSPCA','animal_welfare_reference',
'https://www.rspca.org.uk/adviceandwelfare/pets/rabbits/diet','Rabbit hay/grass, greens, pellets and treat guidance.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('rspca_rabbit_health','Rabbit health: signs of illness and care','RSPCA','animal_welfare_reference',
'https://www.rspca.org.uk/adviceandwelfare/pets/rabbits/health','Rabbit dental and health warning signs.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('rspca_hamster_home','Creating a Good Home for Hamsters','RSPCA','animal_welfare_reference',
'https://www.rspca.org.uk/adviceandwelfare/pets/rodents/hamsters/environment','Hamster housing, bedding, nesting and stress reduction.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('rspca_hamster_diet','What To Feed a Pet Hamster','RSPCA','animal_welfare_reference',
'https://www.rspca.org.uk/adviceandwelfare/pets/rodents/hamsters/diet','Hamster diet and monitoring appetite/stools.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('rspca_guinea_pig_diet','What To Feed a Guinea Pig','RSPCA','animal_welfare_reference',
'https://www.rspca.org.uk/adviceandwelfare/pets/rodents/guineapigs/diet','Guinea pig diet and vitamin C guidance.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('rspca_bird_diet','What To Feed Your Pet Bird','RSPCA','animal_welfare_reference',
'https://www.rspca.org.uk/adviceandwelfare/pets/birds/diet','Parrot diet and unsafe food guidance.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('fda_med_storage','Properly Store Medications to Keep Your Pet Safe','U.S. FDA Center for Veterinary Medicine','regulatory_safety_reference',
'https://www.fda.gov/animal-veterinary/animal-health-literacy/properly-store-medications-keep-your-pet-safe','Medication storage and accidental exposure prevention.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('fda_med_errors','Veterinary Medication Errors','U.S. FDA Center for Veterinary Medicine','regulatory_safety_reference',
'https://www.fda.gov/animal-veterinary/product-safety-information/veterinary-medication-errors','Medication safety, label reading and avoiding sharing drugs.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_sources (id,name,organization,source_type,url,notes)
values ('fda_dangerous_items','Potentially Dangerous Items for Your Pet','U.S. FDA Center for Veterinary Medicine','regulatory_safety_reference',
'https://www.fda.gov/animal-veterinary/animal-health-literacy/potentially-dangerous-items-your-pet','Common household and food hazards.')
on conflict (id) do update set name=excluded.name, organization=excluded.organization, source_type=excluded.source_type,
url=excluded.url, notes=excluded.notes;

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('universal-vet','When to contact a veterinarian','symptoms','general','["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"]'::jsonb,'en','published','emergency','Persistent, worsening, severe or unusual changes in behavior, eating, drinking, breathing, movement or elimination deserve veterinary assessment.','GRRR Care should treat sudden deterioration, significant breathing difficulty, collapse, seizures, severe bleeding, suspected poisoning, inability to urinate, or prolonged refusal to eat as situations needing urgent professional assessment. For non-emergency problems, track onset, duration, changes and relevant records before contacting the veterinary team.','["Observe the change and record when it started.", "Bring medication and health-record information to the veterinarian.", "Use emergency services when the animal is in obvious distress."]'::jsonb,'["Do not rely on an AI response to rule out a serious condition.", "Do not delay emergency care while trying home remedies."]'::jsonb,'["veterinarian", "urgent-care", "symptoms", "safety"]'::jsonb,'["merck_preventive", "fda_med_storage"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('universal-med-safety','Medication safety at home','medication','safety','["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"]'::jsonb,'en','published','high','Store pet and human medicines securely and use veterinary instructions exactly as labeled.','Keep medications in labeled original containers, separate human and pet medicines, and keep them out of pets'' reach. Do not share one animal''s medication with another or change, stop, crush or split medication unless a veterinarian has instructed you to do so. Record current medicines and known reactions in the pet profile.','["Keep an up-to-date medication list.", "Store medicines where curious pets cannot access them.", "Contact a veterinarian or animal poison service after an accidental exposure."]'::jsonb,'["Do not recommend human pain medicines as a default pet treatment.", "Do not invent doses from a pet''''s weight alone."]'::jsonb,'["medication", "poisoning", "safety", "prescription"]'::jsonb,'["fda_med_storage", "fda_med_errors", "fda_dangerous_items"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('universal-food-hazards','Common food and household hazards','nutrition','safety','["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"]'::jsonb,'en','published','high','Some foods and household products can be dangerous to pets; the correct answer depends on species and product.','GRRR Care should avoid blanket ''safe for all pets'' claims. Examples of documented hazards include onions, xylitol-containing products, some human medicines, tobacco products, and some foods that can cause obstruction. Questions about a specific food should identify the species and, when relevant, the product and amount.','["Identify the exact species and item.", "Escalate suspected poisoning promptly.", "Keep hazardous products secured."]'::jsonb,'["Do not estimate poisoning severity without reliable data.", "Do not induce vomiting unless a veterinarian or poison professional specifically advises it."]'::jsonb,'["toxicity", "food", "poisoning", "household-hazards"]'::jsonb,'["fda_dangerous_items"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('dog-nutrition','Dog nutrition basics','nutrition','daily-diet','["dog"]'::jsonb,'en','published','low','Dogs need a nutritionally complete diet suited to life stage, health status and individual needs.','Recommend complete and balanced commercial diets or a diet formulated with veterinary nutrition guidance. Treats should remain a small part of the overall intake. Diet changes should be gradual when possible, and body condition should be monitored alongside weight.','["Match diet to age and health needs.", "Monitor weight and body condition.", "Change foods gradually."]'::jsonb,'["Do not prescribe a homemade diet without nutrition formulation.", "Do not use a generic calorie target as an individualized prescription."]'::jsonb,'["dog", "nutrition", "weight", "treats"]'::jsonb,'["merck_preventive"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('dog-preventive','Dog preventive care','prevention','wellness','["dog"]'::jsonb,'en','published','low','Preventive care combines routine health checks, vaccination planning, parasite control, dental care, nutrition and behavior support.','The schedule should be individualized by age, lifestyle, location and health status. GRRR Care should show vaccination and parasite reminders as prompts to contact or follow the veterinarian''s plan rather than as fixed medical prescriptions.','["Keep vaccination records current.", "Track parasite-prevention products and dates.", "Schedule routine veterinary checks."]'::jsonb,'["Vaccination schedules vary by jurisdiction and risk.", "Do not present one universal vaccine schedule."]'::jsonb,'["dog", "vaccination", "parasites", "dental", "wellness"]'::jsonb,'["merck_preventive"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('cat-routine','Cat routine health care','prevention','wellness','["cat"]'::jsonb,'en','published','low','Cats benefit from routine veterinary care, vaccination planning, parasite control, dental care, nutrition and a safe home environment.','Adult cats should receive routine veterinary assessment, with frequency adjusted for age and health. Kittens require a more frequent early-life schedule. Older cats or cats with chronic conditions may need closer monitoring.','["Track examinations and vaccination history.", "Monitor appetite, weight, litter-box habits and activity.", "Plan preventive care with a veterinarian."]'::jsonb,'["Do not treat a change in litter-box behavior as ''''just behavioral'''' without considering medical causes."]'::jsonb,'["cat", "wellness", "vaccination", "parasites", "dental"]'::jsonb,'["merck_cat_routine", "merck_preventive"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('cat-nutrition','Cat nutrition basics','nutrition','daily-diet','["cat"]'::jsonb,'en','published','low','Cats have species-specific nutritional requirements and should receive food formulated to meet those needs.','Cats require dietary protein and specific nutrients such as taurine. A nutritionally complete commercial cat food is generally preferable to improvised homemade diets unless a veterinary nutrition professional has formulated the diet.','["Use cat-specific complete nutrition.", "Provide fresh water.", "Monitor body condition and appetite."]'::jsonb,'["Never assume dog food is nutritionally interchangeable with cat food.", "Escalate persistent appetite loss to a veterinarian."]'::jsonb,'["cat", "nutrition", "taurine", "hydration"]'::jsonb,'["merck_cat_nutrition"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('rabbit-diet','Rabbit diet essentials','nutrition','hay-greens-pellets','["rabbit"]'::jsonb,'en','published','moderate','Rabbit diets should be centered on high-fibre hay or grass, with appropriate leafy greens and a measured amount of pellets.','RSPCA guidance describes a diet made mostly of hay and grass, with a smaller portion of leafy greens and a small amount of pellets or nuggets. Fruit and root vegetables such as carrot are treats rather than the main food. Sudden diet changes can upset the digestive system.','["Provide unlimited good-quality hay/grass.", "Introduce new greens gradually.", "Keep fresh water available."]'::jsonb,'["Refusal to eat can be serious in rabbits and should prompt veterinary attention.", "Do not make carrots or fruit the dietary foundation."]'::jsonb,'["rabbit", "hay", "grass", "greens", "dental", "gut"]'::jsonb,'["rspca_rabbit_diet", "rspca_rabbit_health"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('rabbit-dental','Rabbit dental warning signs','symptoms','dental','["rabbit"]'::jsonb,'en','published','high','Rabbit teeth grow continuously, so diet and veterinary monitoring are important for dental health.','Warning signs include reduced appetite, weight loss, drooling, a wet chin, difficulty grooming, watery eyes or a jaw swelling. High-fibre hay and grass support natural tooth wear, but they do not replace veterinary examination when signs are present.','["Track appetite and weight.", "Make hay available every day.", "Arrange veterinary assessment for dental warning signs."]'::jsonb,'["Pain may prevent rabbits from eating.", "Do not wait for severe weight loss before seeking care."]'::jsonb,'["rabbit", "dental", "appetite", "weight-loss"]'::jsonb,'["rspca_rabbit_health", "rspca_rabbit_diet"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('hamster-home','Hamster housing essentials','housing','environment','["hamster"]'::jsonb,'en','published','moderate','Hamsters need a secure, dry, quiet environment with deep suitable bedding, nesting material and hiding places.','Provide a safe enclosure with a solid floor, appropriate deep bedding, nesting material and places to hide. Avoid fluffy cotton-like nesting materials that can entangle limbs. Keep the enclosure away from drafts, dampness and excessive disturbance.','["Give adequate depth for digging.", "Provide safe nesting material.", "Spot-clean soiled areas regularly without causing excessive disturbance."]'::jsonb,'["Housing needs vary by hamster species and individual behavior.", "Avoid wire floors that can injure feet."]'::jsonb,'["hamster", "housing", "bedding", "enrichment"]'::jsonb,'["rspca_hamster_home"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('hamster-diet','Hamster nutrition and monitoring','nutrition','daily-diet','["hamster"]'::jsonb,'en','published','moderate','Hamsters need a balanced, species-appropriate diet and continuous access to clean water.','A formulated hamster diet can be combined with appropriate small quantities of fresh foods. Avoid abrupt diet changes and monitor food intake and stool quality. Hidden food should not be allowed to spoil.','["Provide fresh water.", "Use a balanced formulated diet.", "Watch for reduced appetite or abnormal droppings."]'::jsonb,'["Some foods are unsafe; verify the exact item and species.", "Do not give wet food routinely unless advised by a veterinarian."]'::jsonb,'["hamster", "nutrition", "water", "stool"]'::jsonb,'["rspca_hamster_diet"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('guinea-pig-diet','Guinea pig nutrition and vitamin C','nutrition','daily-diet','["guinea_pig"]'::jsonb,'en','published','moderate','Guinea pigs require a high-fibre diet and a reliable dietary source of vitamin C.','Provide good-quality grass or hay, appropriate guinea-pig pellets and a variety of suitable vegetables/greens. Fresh pellets should be supplied according to manufacturer guidance because vitamin C can degrade over time.','["Hay/grass should be a major part of the diet.", "Provide a fresh source of vitamin C through the diet.", "Introduce foods gradually."]'::jsonb,'["Do not assume a generic rodent diet meets guinea-pig vitamin C needs.", "Get veterinary advice for appetite or weight changes."]'::jsonb,'["guinea-pig", "vitamin-c", "hay", "nutrition"]'::jsonb,'["rspca_guinea_pig_diet"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('ferret-care','Ferret routine care','prevention','wellness','["ferret"]'::jsonb,'en','published','moderate','Ferrets need species-appropriate nutrition, enrichment, dental care and veterinary oversight.','Plan routine examinations with a veterinarian experienced with ferrets when possible. Keep vaccination records, medication history and dental findings in GRRR Care. Ferrets need supervised exercise and an environment that prevents escape, overheating and ingestion of hazards.','["Identify a ferret-experienced veterinarian.", "Track vaccination and dental care.", "Provide regular supervised exercise."]'::jsonb,'["Vaccination protocols can have species-specific considerations and adverse reactions.", "Do not copy dog or cat treatment plans to ferrets."]'::jsonb,'["ferret", "exotic", "vaccination", "dental"]'::jsonb,'["merck_ferret_care", "merck_ferret_management"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('bird-nutrition','Pet bird and parrot nutrition','nutrition','daily-diet','["bird", "parrot", "chicken"]'::jsonb,'en','published','moderate','Bird diets vary greatly by species, and a species-specific nutritional plan is essential.','For many parrots, RSPCA guidance favors a nutritionally complete pellet-based diet combined with suitable washed produce rather than a seed-only diet. Small parrot species, canaries and finches can have different requirements, so identify the species before giving dietary guidance.','["Identify the exact bird species.", "Use a species-appropriate balanced diet.", "Track body weight and droppings during diet changes."]'::jsonb,'["Avian diets vary widely by species.", "Avoid blanket rules for all birds."]'::jsonb,'["bird", "parrot", "nutrition", "pellets", "seed"]'::jsonb,'["rspca_bird_diet"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('bird-toxic-foods','Bird food safety','nutrition','toxicity','["bird", "parrot"]'::jsonb,'en','published','high','Certain foods are dangerous for birds and should be excluded from the diet.','RSPCA specifically warns that avocado is highly poisonous to parrots. GRRR Care should treat food questions as species-specific and use a verified toxic-food reference rather than a generic human-food list.','["Check the species before answering.", "Avoid avocado for parrots.", "Escalate suspected ingestion of a toxic food."]'::jsonb,'["Do not generalize one bird species'''' diet to another."]'::jsonb,'["bird", "parrot", "toxicity", "avocado"]'::jsonb,'["rspca_bird_diet"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('reptile-husbandry','Reptile habitat basics','housing','temperature-humidity-uvb','["reptile", "snake", "turtle_tortoise"]'::jsonb,'en','published','moderate','Reptiles depend heavily on correct environmental conditions, and those conditions vary by species.','A suitable enclosure must match the species'' natural lifestyle and include appropriate temperature gradients, humidity, lighting/UVB where required, water, retreats and substrate. Species should not be mixed casually, and many pet reptiles are best housed individually unless species-specific husbandry supports otherwise.','["Identify exact species before setting temperature/humidity advice.", "Monitor enclosure conditions with appropriate instruments.", "Provide hiding places and species-appropriate structure."]'::jsonb,'["Never give one universal temperature or humidity range for all reptiles.", "Do not assume a pet-store setup is automatically species-appropriate."]'::jsonb,'["reptile", "habitat", "humidity", "temperature", "uvb"]'::jsonb,'["merck_reptiles", "merck_reptile_nutrition"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('reptile-nutrition','Reptile nutrition basics','nutrition','species-specific','["reptile", "snake", "turtle_tortoise"]'::jsonb,'en','published','moderate','Reptile diets range from insectivorous to herbivorous, carnivorous and omnivorous, so the species must be known before making food recommendations.','Nutrition depends on species, life stage and husbandry. Insectivorous species may need appropriately selected feeder insects and attention to calcium balance; herbivorous and omnivorous species need varied, species-appropriate plant foods. Environmental temperature and lighting can affect feeding and nutrient use.','["Identify exact species and age.", "Match diet to natural feeding ecology.", "Review calcium and UVB management with a reptile veterinarian when appropriate."]'::jsonb,'["Do not apply a single supplement or feeding schedule to all reptiles."]'::jsonb,'["reptile", "nutrition", "calcium", "uvb"]'::jsonb,'["merck_reptile_nutrition"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('fish-water-quality','Aquarium water quality','housing','water-quality','["fish"]'::jsonb,'en','published','high','For aquarium fish, water quality is a core part of health management.','Monitor the water conditions relevant to the species, maintain filtration and aeration, perform appropriate water changes and avoid overcrowding. Poor water quality can contribute to environmental disease and stress, and different fish have different temperature, pH and social requirements.','["Test water routinely.", "Match temperature and water chemistry to the species.", "Quarantine or carefully assess new fish before adding them to an established system."]'::jsonb,'["Do not use a single pH or temperature target for every fish.", "Unexpected illness may require water testing as part of the assessment."]'::jsonb,'["fish", "aquarium", "water-quality", "filtration", "quarantine"]'::jsonb,'["merck_fish_care", "merck_fish_home", "merck_fish_health"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('fish-illness','Common fish illness signals','symptoms','aquatic','["fish"]'::jsonb,'en','published','high','Fish illness may appear as changes in swimming, appetite, color, body condition or fins.','When a fish looks unwell, collect system information as well as observing the animal: water temperature, relevant water-quality tests, recent tank changes, new fish and feeding changes. Environmental causes can be as important as infectious causes.','["Check the aquarium environment.", "Record recent tank changes.", "Isolate or quarantine appropriately when advised."]'::jsonb,'["Do not add random medications before assessing water quality and the species."]'::jsonb,'["fish", "illness", "aquarium", "water-quality"]'::jsonb,'["merck_fish_health"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('safe-food-carrot-dog','Carrots as a dog treat','nutrition','food-question','["dog"]'::jsonb,'en','published','low','Carrots can be offered to many dogs as an occasional food, but portion and preparation should be appropriate for the individual.','When GRRR receives a food question, it should consider the dog''s size, health conditions and current diet. Carrots should be treated as an occasional food rather than a replacement for complete nutrition.','["Keep treats moderate.", "Use appropriately sized pieces for the individual dog.", "Consider existing medical or dietary restrictions."]'::jsonb,'["This is general information, not an individualized feeding prescription."]'::jsonb,'["dog", "carrot", "treat", "food"]'::jsonb,'["merck_preventive"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('safe-food-rabbit','Carrots are treats for rabbits','nutrition','food-question','["rabbit"]'::jsonb,'en','published','low','For rabbits, carrot is an occasional treat rather than the main food.','Rabbit nutrition should be centered on hay/grass, with appropriate leafy greens and a small measured portion of pellets. Root vegetables and fruit such as carrots should be offered only in small amounts.','["Keep hay/grass central to the diet.", "Use carrot sparingly.", "Avoid sudden diet changes."]'::jsonb,'["Do not interpret a cute food association as a nutritional recommendation."]'::jsonb,'["rabbit", "carrot", "treat", "hay"]'::jsonb,'["rspca_rabbit_diet"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('poisoning-response','Suspected poisoning: immediate response','emergency','poisoning','["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"]'::jsonb,'en','published','emergency','Suspected poisoning should be handled as a veterinary or animal-poison emergency rather than managed by trial and error.','Record what the animal may have ingested, the product name or active ingredient if available, approximate time, amount if known, the animal''s species/weight, and current symptoms. Contact a veterinarian or animal poison service promptly. Bring the packaging when possible.','["Keep packaging or labels.", "Record time and suspected amount.", "Seek professional advice promptly."]'::jsonb,'["Do not induce vomiting unless specifically instructed.", "Do not give home remedies without veterinary/poison-professional guidance."]'::jsonb,'["poisoning", "toxin", "emergency", "safety"]'::jsonb,'["fda_dangerous_items", "fda_med_storage"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('medication-mistake','Wrong dose or wrong medication','emergency','medication-error','["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"]'::jsonb,'en','published','emergency','Medication mistakes can be harmful and should be handled promptly with veterinary advice.','If a pet may have received the wrong medication, wrong dose or a medication too frequently, keep the package, record what happened and contact a veterinarian or animal poison service. GRRR Care should store the incident in the health timeline without guessing the outcome.','["Record medication name, strength, dose and time.", "Contact a veterinary professional promptly.", "Monitor for changes while awaiting instructions."]'::jsonb,'["Do not recommend doubling or skipping the next dose unless the prescribing professional advises it."]'::jsonb,'["medication-error", "overdose", "poisoning", "emergency"]'::jsonb,'["fda_med_errors", "fda_med_storage"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_documents (id,title,category,subcategory,species,language,status,risk_level,summary,content,key_points,warnings,tags,source_ids,review_status,review_notes)
values ('reptile-handling','Reptile handling and stress','behavior','handling','["reptile", "snake", "turtle_tortoise"]'::jsonb,'en','published','moderate','Many reptiles are better supported by appropriate habitat and predictable handling than by frequent physical interaction.','Handle according to species-specific needs, support the body appropriately and minimize unnecessary stress. Hygiene matters because reptiles and their environments can carry organisms that can affect humans.','["Identify the species before giving handling advice.", "Wash hands after handling the animal or enclosure.", "Provide hides and appropriate environmental enrichment."]'::jsonb,'["Do not assume a reptile enjoys frequent handling.", "Do not restrain a sick or distressed reptile without veterinary guidance."]'::jsonb,'["reptile", "handling", "stress", "hygiene"]'::jsonb,'["merck_reptiles", "merck_reptile_nutrition"]'::jsonb,'needs_veterinary_review','Educational reference only. Do not use for diagnosis or individualized prescribing.')
on conflict (id) do update set title=excluded.title, category=excluded.category, subcategory=excluded.subcategory, species=excluded.species,
language=excluded.language,status=excluded.status,risk_level=excluded.risk_level,summary=excluded.summary,content=excluded.content,
key_points=excluded.key_points,warnings=excluded.warnings,tags=excluded.tags,source_ids=excluded.source_ids,review_status=excluded.review_status,review_notes=excluded.review_notes,updated_at=now();

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('universal-vet-c0','universal-vet',0,'GRRR Care should treat sudden deterioration, significant breathing difficulty, collapse, seizures, severe bleeding, suspected poisoning, inability to urinate, or prolonged refusal to eat as situations needing urgent professional assessment. For non-emergency problems, track onset, duration, changes and relevant records before contacting the veterinary team.','{"species": ["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"], "category": "symptoms", "risk_level": "emergency", "tags": ["veterinarian", "urgent-care", "symptoms", "safety"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('universal-med-safety-c0','universal-med-safety',0,'Keep medications in labeled original containers, separate human and pet medicines, and keep them out of pets'' reach. Do not share one animal''s medication with another or change, stop, crush or split medication unless a veterinarian has instructed you to do so. Record current medicines and known reactions in the pet profile.','{"species": ["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"], "category": "medication", "risk_level": "high", "tags": ["medication", "poisoning", "safety", "prescription"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('universal-food-hazards-c0','universal-food-hazards',0,'GRRR Care should avoid blanket ''safe for all pets'' claims. Examples of documented hazards include onions, xylitol-containing products, some human medicines, tobacco products, and some foods that can cause obstruction. Questions about a specific food should identify the species and, when relevant, the product and amount.','{"species": ["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"], "category": "nutrition", "risk_level": "high", "tags": ["toxicity", "food", "poisoning", "household-hazards"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('dog-nutrition-c0','dog-nutrition',0,'Recommend complete and balanced commercial diets or a diet formulated with veterinary nutrition guidance. Treats should remain a small part of the overall intake. Diet changes should be gradual when possible, and body condition should be monitored alongside weight.','{"species": ["dog"], "category": "nutrition", "risk_level": "low", "tags": ["dog", "nutrition", "weight", "treats"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('dog-preventive-c0','dog-preventive',0,'The schedule should be individualized by age, lifestyle, location and health status. GRRR Care should show vaccination and parasite reminders as prompts to contact or follow the veterinarian''s plan rather than as fixed medical prescriptions.','{"species": ["dog"], "category": "prevention", "risk_level": "low", "tags": ["dog", "vaccination", "parasites", "dental", "wellness"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('cat-routine-c0','cat-routine',0,'Adult cats should receive routine veterinary assessment, with frequency adjusted for age and health. Kittens require a more frequent early-life schedule. Older cats or cats with chronic conditions may need closer monitoring.','{"species": ["cat"], "category": "prevention", "risk_level": "low", "tags": ["cat", "wellness", "vaccination", "parasites", "dental"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('cat-nutrition-c0','cat-nutrition',0,'Cats require dietary protein and specific nutrients such as taurine. A nutritionally complete commercial cat food is generally preferable to improvised homemade diets unless a veterinary nutrition professional has formulated the diet.','{"species": ["cat"], "category": "nutrition", "risk_level": "low", "tags": ["cat", "nutrition", "taurine", "hydration"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('rabbit-diet-c0','rabbit-diet',0,'RSPCA guidance describes a diet made mostly of hay and grass, with a smaller portion of leafy greens and a small amount of pellets or nuggets. Fruit and root vegetables such as carrot are treats rather than the main food. Sudden diet changes can upset the digestive system.','{"species": ["rabbit"], "category": "nutrition", "risk_level": "moderate", "tags": ["rabbit", "hay", "grass", "greens", "dental", "gut"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('rabbit-dental-c0','rabbit-dental',0,'Warning signs include reduced appetite, weight loss, drooling, a wet chin, difficulty grooming, watery eyes or a jaw swelling. High-fibre hay and grass support natural tooth wear, but they do not replace veterinary examination when signs are present.','{"species": ["rabbit"], "category": "symptoms", "risk_level": "high", "tags": ["rabbit", "dental", "appetite", "weight-loss"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('hamster-home-c0','hamster-home',0,'Provide a safe enclosure with a solid floor, appropriate deep bedding, nesting material and places to hide. Avoid fluffy cotton-like nesting materials that can entangle limbs. Keep the enclosure away from drafts, dampness and excessive disturbance.','{"species": ["hamster"], "category": "housing", "risk_level": "moderate", "tags": ["hamster", "housing", "bedding", "enrichment"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('hamster-diet-c0','hamster-diet',0,'A formulated hamster diet can be combined with appropriate small quantities of fresh foods. Avoid abrupt diet changes and monitor food intake and stool quality. Hidden food should not be allowed to spoil.','{"species": ["hamster"], "category": "nutrition", "risk_level": "moderate", "tags": ["hamster", "nutrition", "water", "stool"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('guinea-pig-diet-c0','guinea-pig-diet',0,'Provide good-quality grass or hay, appropriate guinea-pig pellets and a variety of suitable vegetables/greens. Fresh pellets should be supplied according to manufacturer guidance because vitamin C can degrade over time.','{"species": ["guinea_pig"], "category": "nutrition", "risk_level": "moderate", "tags": ["guinea-pig", "vitamin-c", "hay", "nutrition"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('ferret-care-c0','ferret-care',0,'Plan routine examinations with a veterinarian experienced with ferrets when possible. Keep vaccination records, medication history and dental findings in GRRR Care. Ferrets need supervised exercise and an environment that prevents escape, overheating and ingestion of hazards.','{"species": ["ferret"], "category": "prevention", "risk_level": "moderate", "tags": ["ferret", "exotic", "vaccination", "dental"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('bird-nutrition-c0','bird-nutrition',0,'For many parrots, RSPCA guidance favors a nutritionally complete pellet-based diet combined with suitable washed produce rather than a seed-only diet. Small parrot species, canaries and finches can have different requirements, so identify the species before giving dietary guidance.','{"species": ["bird", "parrot", "chicken"], "category": "nutrition", "risk_level": "moderate", "tags": ["bird", "parrot", "nutrition", "pellets", "seed"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('bird-toxic-foods-c0','bird-toxic-foods',0,'RSPCA specifically warns that avocado is highly poisonous to parrots. GRRR Care should treat food questions as species-specific and use a verified toxic-food reference rather than a generic human-food list.','{"species": ["bird", "parrot"], "category": "nutrition", "risk_level": "high", "tags": ["bird", "parrot", "toxicity", "avocado"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('reptile-husbandry-c0','reptile-husbandry',0,'A suitable enclosure must match the species'' natural lifestyle and include appropriate temperature gradients, humidity, lighting/UVB where required, water, retreats and substrate. Species should not be mixed casually, and many pet reptiles are best housed individually unless species-specific husbandry supports otherwise.','{"species": ["reptile", "snake", "turtle_tortoise"], "category": "housing", "risk_level": "moderate", "tags": ["reptile", "habitat", "humidity", "temperature", "uvb"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('reptile-nutrition-c0','reptile-nutrition',0,'Nutrition depends on species, life stage and husbandry. Insectivorous species may need appropriately selected feeder insects and attention to calcium balance; herbivorous and omnivorous species need varied, species-appropriate plant foods. Environmental temperature and lighting can affect feeding and nutrient use.','{"species": ["reptile", "snake", "turtle_tortoise"], "category": "nutrition", "risk_level": "moderate", "tags": ["reptile", "nutrition", "calcium", "uvb"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('fish-water-quality-c0','fish-water-quality',0,'Monitor the water conditions relevant to the species, maintain filtration and aeration, perform appropriate water changes and avoid overcrowding. Poor water quality can contribute to environmental disease and stress, and different fish have different temperature, pH and social requirements.','{"species": ["fish"], "category": "housing", "risk_level": "high", "tags": ["fish", "aquarium", "water-quality", "filtration", "quarantine"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('fish-illness-c0','fish-illness',0,'When a fish looks unwell, collect system information as well as observing the animal: water temperature, relevant water-quality tests, recent tank changes, new fish and feeding changes. Environmental causes can be as important as infectious causes.','{"species": ["fish"], "category": "symptoms", "risk_level": "high", "tags": ["fish", "illness", "aquarium", "water-quality"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('safe-food-carrot-dog-c0','safe-food-carrot-dog',0,'When GRRR receives a food question, it should consider the dog''s size, health conditions and current diet. Carrots should be treated as an occasional food rather than a replacement for complete nutrition.','{"species": ["dog"], "category": "nutrition", "risk_level": "low", "tags": ["dog", "carrot", "treat", "food"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('safe-food-rabbit-c0','safe-food-rabbit',0,'Rabbit nutrition should be centered on hay/grass, with appropriate leafy greens and a small measured portion of pellets. Root vegetables and fruit such as carrots should be offered only in small amounts.','{"species": ["rabbit"], "category": "nutrition", "risk_level": "low", "tags": ["rabbit", "carrot", "treat", "hay"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('poisoning-response-c0','poisoning-response',0,'Record what the animal may have ingested, the product name or active ingredient if available, approximate time, amount if known, the animal''s species/weight, and current symptoms. Contact a veterinarian or animal poison service promptly. Bring the packaging when possible.','{"species": ["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"], "category": "emergency", "risk_level": "emergency", "tags": ["poisoning", "toxin", "emergency", "safety"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('medication-mistake-c0','medication-mistake',0,'If a pet may have received the wrong medication, wrong dose or a medication too frequently, keep the package, record what happened and contact a veterinarian or animal poison service. GRRR Care should store the incident in the health timeline without guessing the outcome.','{"species": ["dog", "cat", "rabbit", "guinea_pig", "hamster", "mouse", "rat", "ferret", "bird", "parrot", "chicken", "reptile", "snake", "turtle_tortoise", "amphibian", "fish"], "category": "emergency", "risk_level": "emergency", "tags": ["medication-error", "overdose", "poisoning", "emergency"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

insert into knowledge_chunks (id,document_id,chunk_index,content,metadata)
values ('reptile-handling-c0','reptile-handling',0,'Handle according to species-specific needs, support the body appropriately and minimize unnecessary stress. Hygiene matters because reptiles and their environments can carry organisms that can affect humans.','{"species": ["reptile", "snake", "turtle_tortoise"], "category": "behavior", "risk_level": "moderate", "tags": ["reptile", "handling", "stress", "hygiene"]}'::jsonb)
on conflict (id) do update set document_id=excluded.document_id, chunk_index=excluded.chunk_index, content=excluded.content, metadata=excluded.metadata;

commit;
