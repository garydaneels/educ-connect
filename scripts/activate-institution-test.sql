-- Mettre l'abonnement de l'institution test au statut ACTIVE
UPDATE "Subscription"
SET status = 'ACTIVE'
WHERE "institutionId" IN (
  SELECT id FROM "Institution"
  WHERE name LIKE '%Test%' OR name LIKE '%test%'
)
AND status != 'ACTIVE';

-- Vérifier les changements
SELECT i.name, s.status
FROM "Subscription" s
JOIN "Institution" i ON s."institutionId" = i.id
WHERE i.name LIKE '%Test%' OR i.name LIKE '%test%';
