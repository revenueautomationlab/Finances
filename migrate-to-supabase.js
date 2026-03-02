/**
 * Migration script to import data from db.json to Supabase PostgreSQL
 * 
 * Installation:
 * 1. npm install dotenv @supabase/supabase-js
 * 
 * Usage:
 * 1. Create a .env.local file with your Supabase credentials:
 *    VITE_SUPABASE_URL=your_supabase_url
 *    VITE_SUPABASE_ANON_KEY=your_supabase_key
 * 
 * 2. Run: node migrate-to-supabase.js
 */

import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Get credentials from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
  console.error('Please create a .env.local file with your Supabase credentials')
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function migrate() {
  try {
    console.log('🔄 Starting migration...\n')

    // Read db.json
    const dbData = JSON.parse(readFileSync('db.json', 'utf-8'))
    console.log(`📦 Loaded data:`)
    console.log(`   - ${dbData.projects?.length || 0} projects`)
    console.log(`   - ${dbData.bankSpending?.length || 0} bank spending records`)
    console.log(`   - ${dbData.charitySpending?.length || 0} charity spending records\n`)

    // Clear existing data (optional)
    console.log('🗑️  Clearing existing data...')
    await supabase.from('payments').delete().neq('id', '')
    await supabase.from('expenses').delete().neq('id', '')
    await supabase.from('projects').delete().neq('id', '')
    await supabase.from('bank_spending').delete().neq('id', '')
    await supabase.from('charity_spending').delete().neq('id', '')
    console.log('✅ Tables cleared\n')

    // Insert projects
    if (dbData.projects && dbData.projects.length > 0) {
      console.log('📂 Inserting projects...')
      const projectsToInsert = dbData.projects.map(p => ({
        id: p.id,
        name: p.name,
        total_value: p.totalValue,
        created_at: p.createdAt
      }))
      
      const { error: projectError } = await supabase
        .from('projects')
        .insert(projectsToInsert)
      
      if (projectError) {
        console.error('❌ Error inserting projects:', projectError)
        throw projectError
      }
      console.log(`✅ Inserted ${dbData.projects.length} projects\n`)

      // Insert payments
      console.log('💰 Inserting payments...')
      const paymentsToInsert = []
      dbData.projects.forEach(p => {
        p.payments?.forEach(payment => {
          paymentsToInsert.push({
            id: payment.id,
            project_id: p.id,
            amount: payment.amount,
            date: payment.date,
            note: payment.note || null
          })
        })
      })

      if (paymentsToInsert.length > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert(paymentsToInsert)
        
        if (paymentError) {
          console.error('❌ Error inserting payments:', paymentError)
          throw paymentError
        }
        console.log(`✅ Inserted ${paymentsToInsert.length} payments\n`)
      }

      // Insert expenses
      console.log('📊 Inserting expenses...')
      const expensesToInsert = []
      dbData.projects.forEach(p => {
        p.expenses?.forEach(expense => {
          expensesToInsert.push({
            id: expense.id,
            project_id: p.id,
            amount: expense.amount,
            date: expense.date,
            description: expense.description || null
          })
        })
      })

      if (expensesToInsert.length > 0) {
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert(expensesToInsert)
        
        if (expenseError) {
          console.error('❌ Error inserting expenses:', expenseError)
          throw expenseError
        }
        console.log(`✅ Inserted ${expensesToInsert.length} expenses\n`)
      }
    }

    // Insert bank spending
    if (dbData.bankSpending && dbData.bankSpending.length > 0) {
      console.log('🏦 Inserting bank spending...')
      const bankToInsert = dbData.bankSpending.map(b => ({
        id: b.id,
        amount: b.amount,
        date: b.date,
        description: b.description || null
      }))

      const { error: bankError } = await supabase
        .from('bank_spending')
        .insert(bankToInsert)
      
      if (bankError) {
        console.error('❌ Error inserting bank spending:', bankError)
        throw bankError
      }
      console.log(`✅ Inserted ${dbData.bankSpending.length} bank spending records\n`)
    }

    // Insert charity spending
    if (dbData.charitySpending && dbData.charitySpending.length > 0) {
      console.log('❤️  Inserting charity spending...')
      const charityToInsert = dbData.charitySpending.map(c => ({
        id: c.id,
        amount: c.amount,
        date: c.date,
        description: c.description || null
      }))

      const { error: charityError } = await supabase
        .from('charity_spending')
        .insert(charityToInsert)
      
      if (charityError) {
        console.error('❌ Error inserting charity spending:', charityError)
        throw charityError
      }
      console.log(`✅ Inserted ${dbData.charitySpending.length} charity spending records\n`)
    }

    console.log('🎉 Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

migrate()
