import Database from "@tauri-apps/plugin-sql";

export async function testDatabaseConnection() {
  try {
    console.log("Testing database connection...");
    const db = await Database.load("postgres://neon:npg@localhost:5432/toast?sslmode=require");
    console.log("✓ Connected to database successfully");

    // Verificar que la tabla existe
    const tables = await db.select(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    console.log("✓ Tables in database:", tables);

    // Insertar un registro de prueba
    const testDate = new Date().toISOString().split('T')[0];
    await db.execute(
      `INSERT INTO daily_stats (date, concentrated, inactive, pauses) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(date) DO UPDATE SET 
       concentrated = $2, inactive = $3, pauses = $4`,
      [testDate, 100, 50, 10]
    );
    console.log("✓ Test record inserted");

    // Leer el registro de prueba
    const result = await db.select(
      `SELECT * FROM daily_stats WHERE date = $1`,
      [testDate]
    );
    console.log("✓ Test record retrieved:", result);

    return { success: true, data: result };
  } catch (error) {
    console.error("✗ Database test failed:", error);
    return { success: false, error: String(error) };
  }
}
