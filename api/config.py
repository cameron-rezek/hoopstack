from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str

    db_pool_min: int = 2
    db_pool_max: int = 10

    api_key: str = ""

    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": "api/.env", "env_file_encoding": "utf-8"}

    @property
    def dsn(self) -> str:
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"


settings = Settings()
