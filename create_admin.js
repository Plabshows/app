require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xowamwryzwhchryozsxe.supabase.co';
// Usa la clave de servicio (Service Role Key) que debe estar en tu .env o hardcodeada aquí solo para un uso
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY no está definida en tu entorno. Revisa el archivo .env.");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdminUser() {
    const email = 'hizesupremos@gmail.com';
    const password = 'Supremos1.';

    console.log(`Intentando crear usuario: ${email}...`);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Esto es crítico para saltarse el envío de email
        user_metadata: { full_name: 'Admin Supremo' }
    });

    if (error) {
        if (error.message.includes('already registered')) {
            console.log(`⚠️ El usuario ${email} ya existe en Supabase.`);
            // Intentar actualizar el password por si acaso
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = usersData?.users.find(u => u.email === email);
            if (existingUser) {
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: password, email_confirm: true });
                if (updateError) {
                    console.error("❌ Falló la actualización de contraseña:", updateError);
                } else {
                    console.log("✅ Contraseña actualizada y cuenta confirmada para usuario existente.");
                }
            }
        } else {
            console.error('❌ Error creando usuario:', error);
        }
    } else {
        console.log('✅ Usuario creado e insertado en Auth exitosamente:', data.user.id);

        // El trigger en la base de datos debería crear la entrada en public.profiles
        // Vamos a asegurarnos de que la cuenta es admin según el rol
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ is_admin: true, role: 'admin' })
            .eq('id', data.user.id);

        if (profileError) {
            console.error('⚠️ Error actualizando el profile para hacerlo admin:', profileError);
            // Supabase trigger might not have fired yet or maybe wait a second
        } else {
            console.log('✅ Perfil actualizado con permisos de administrador.');
        }
    }
}

createAdminUser();
