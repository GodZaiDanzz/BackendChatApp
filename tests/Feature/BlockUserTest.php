<?php

namespace Tests\Feature;

use App\Models\BlockedUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BlockUserTest extends TestCase
{
    use RefreshDatabase;

    protected User $user1;
    protected User $user2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user1 = User::factory()->create(['username' => 'user1', 'display_name' => 'User One']);
        $this->user2 = User::factory()->create(['username' => 'user2', 'display_name' => 'User Two']);
    }

    public function test_user_can_block_and_unblock_contact(): void
    {
        // 1. User 1 blocks User 2
        $res = $this->actingAs($this->user1, 'sanctum')
            ->postJson("/api/contacts/{$this->user2->id}/block");
        $res->assertStatus(200);

        $this->assertDatabaseHas('blocked_users', [
            'user_id'         => $this->user1->id,
            'blocked_user_id' => $this->user2->id,
        ]);

        // 2. Blocked users list
        $listRes = $this->actingAs($this->user1, 'sanctum')
            ->getJson('/api/blocked-users');
        $listRes->assertStatus(200);
        $this->assertCount(1, $listRes->json());
        $this->assertEquals($this->user2->id, $listRes->json()[0]['id']);

        // 3. User 2 tries to send message to User 1 -> 403
        $msgRes = $this->actingAs($this->user2, 'sanctum')
            ->postJson('/api/messages', [
                'client_uuid' => (string) \Illuminate\Support\Str::uuid(),
                'receiver_id' => $this->user1->id,
                'body'        => 'Halo apakah kamu memblokirku?',
            ]);
        $msgRes->assertStatus(403);

        // 4. User 1 unblocks User 2
        $unblockRes = $this->actingAs($this->user1, 'sanctum')
            ->postJson("/api/contacts/{$this->user2->id}/unblock");
        $unblockRes->assertStatus(200);

        $this->assertDatabaseMissing('blocked_users', [
            'user_id'         => $this->user1->id,
            'blocked_user_id' => $this->user2->id,
        ]);

        // 5. User 2 can now send message
        $msgRes2 = $this->actingAs($this->user2, 'sanctum')
            ->postJson('/api/messages', [
                'client_uuid' => (string) \Illuminate\Support\Str::uuid(),
                'receiver_id' => $this->user1->id,
                'body'        => 'Halo sekarang sudah terbuka!',
            ]);
        $msgRes2->assertStatus(201);
    }
}
