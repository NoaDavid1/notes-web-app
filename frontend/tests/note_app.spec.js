const { test, expect } = require('@playwright/test');

test.describe('Note app', () => {

    test.beforeEach(async ({ page, request }) => {
        await request.post('http://localhost:3001/api/testing/reset');
        await request.post('http://localhost:3001/users', {
            data: {
                name: 'Matti Luukkainen',
                email: 'mluukkai@gmail.com',
                username: 'mluukkai',
                password: 'salainen'
            }
        });
    
        await page.goto('http://localhost:3000');
    });

    test('Switch to Dark Theme form can be clicked', async ({ page }) => {
        //await page.goto('http://localhost:3000');
    
        await page.getByRole('button', { name: 'Switch to Dark Theme' }).click();
        //Check the CSS properties for the dark theme
        await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(51, 51, 51)'); // #333333 in rgb
    });

    test('Login form can be opened', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        await page.getByRole('button', { name: 'Login' }).click();
        // Locate the login form by its name attribute
        const loginForm = page.locator('form[name="login_form"]');
        // Check if the login form is visible
        await expect(loginForm).toBeVisible();
    });

    test.describe('when logged in', () => {
        test.beforeEach(async ({ page }) => {
            await page.getByTestId('usernamelogin').fill('mluukkai');
            await page.getByTestId('passwordlogin').fill('salainen');
            await page.getByRole('button', { name: 'Login' }).click();
            await expect(page.getByText('Matti Luukkainen logged-in')).toBeVisible();
        });
    

        test('a new note can be created', async ({ page }) => {
            await page.getByRole('button', { name: 'Add Note' }).click();
            await page.getByTestId('title').fill('check by playwright');
            await page.getByTestId('content').fill('a note created by playwright');
            await page.getByRole('button', { name: 'Save' }).click();
            await expect(page.getByText('Note added successfully!')).toBeVisible();
        });
        
        test('Logout can be possible', async ({ page }) => {
            await page.getByRole('button', { name: 'Logout' }).click();
            const loginForm = page.locator('form[name="login_form"]');
            // Check if the login form is visible
            await expect(loginForm).toBeVisible();
        });


        /*test('Note can be edited', async ({ page }) => {
            await page.getByRole('button', { name: 'Edit' }).click();
            await page.getByTestId('editcontent').fill('Edited by playwright');
            await page.getByRole('button', { name: 'Save' }).click();
            //await expect(page.getByText('a note edited by playwright')).toBeVisible();
        });*/
    });
    
    test('login fails with wrong password', async ({ page }) => {
        // Fill in username and password
        await page.getByTestId('usernamelogin').fill('mluukkai');
        await page.getByTestId('passwordlogin').fill('wrong');
        
        // Click the login button
        await page.getByRole('button', { name: 'Login' }).click();
        
        // Assert that the error message is displayed
        const errorMessage = await page.getByText('Invalid username or password.');
        await expect(errorMessage).toBeVisible();
    });

});
