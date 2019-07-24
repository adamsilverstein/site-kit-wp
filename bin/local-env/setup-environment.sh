# Configure environment for testing.
echo -e $(status_message "Configuring environment for testing...")
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI user meta update admin wp_googlesitekit_site_verified_meta verified --quiet
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI user meta list admin
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI user meta update admin wp_googlesitekit_auth_scopes $wp_googlesitekit_auth_scopes --format=json --quiet
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI user meta update admin wp_googlesitekit_access_token $wp_googlesitekit_access_token --quiet
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI user meta update admin wp_googlesitekit_refresh_token $wp_googlesitekit_refresh_token --quiet
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI user meta list admin
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI option set googlesitekit_credentials $googlesitekit_credentials --quiet
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI option set googlesitekit_first_admin 1 --quiet
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 $CLI option list
docker-compose $DOCKER_COMPOSE_FILE_OPTIONS run --rm -u 33 GOOGLESITEKIT_ENCRYPTION_KEY=$GOOGLESITEKIT_ENCRYPTION_KEY; GOOGLESITEKIT_ENCRYPTION_SALT=$GOOGLESITEKIT_ENCRYPTION_SALT
