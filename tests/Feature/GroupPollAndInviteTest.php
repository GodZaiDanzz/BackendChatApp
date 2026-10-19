<?php

namespace Tests\Feature;

use App\Models\Group;
use App\Models\GroupMember;
use App\Models\GroupPoll;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupPollAndInviteTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_poll_in_group()
    {
        $user = User::factory()->create();
        $group = Group::create([
            'name' => 'Testing Poll Group',
            'group_key' => bin2hex(random_bytes(32)),
            'created_by' => $user->id,
            'invite_code' => 'testcode123',
        ]);
        GroupMember::create([
            'group_id' => $group->id,
            'user_id' => $user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/groups/{$group->id}/polls", [
            'question' => 'Kapan jadwal rapat PKL?',
            'options' => ['Hari Senin', 'Hari Rabu', 'Hari Jumat'],
            'multiple_answers' => false,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('poll.question', 'Kapan jadwal rapat PKL?');
        $this->assertCount(3, $response->json('poll.options'));

        $this->assertDatabaseHas('group_polls', [
            'group_id' => $group->id,
            'question' => 'Kapan jadwal rapat PKL?',
        ]);
    }

    public function test_user_can_vote_and_toggle_vote_on_poll()
    {
        $user = User::factory()->create();
        $group = Group::create([
            'name' => 'Testing Poll Group',
            'group_key' => bin2hex(random_bytes(32)),
            'created_by' => $user->id,
            'invite_code' => 'testcode123',
        ]);
        GroupMember::create([
            'group_id' => $group->id,
            'user_id' => $user->id,
            'role' => 'admin',
        ]);

        $pollRes = $this->actingAs($user, 'sanctum')->postJson("/api/groups/{$group->id}/polls", [
            'question' => 'Pilihan makan siang?',
            'options' => ['Nasi Goreng', 'Ayam Bakar'],
        ]);
        $pollId = $pollRes->json('poll.id');
        $optionId = $pollRes->json('poll.options.0.id');

        // Vote
        $voteRes = $this->actingAs($user, 'sanctum')->postJson("/api/groups/{$group->id}/polls/{$pollId}/vote", [
            'option_id' => $optionId,
        ]);
        $voteRes->assertStatus(200);
        $this->assertEquals(1, $voteRes->json('total_votes'));
        $this->assertTrue($voteRes->json('options.0.is_voted_by_me'));

        // Toggle vote (unvote)
        $unvoteRes = $this->actingAs($user, 'sanctum')->postJson("/api/groups/{$group->id}/polls/{$pollId}/vote", [
            'option_id' => $optionId,
        ]);
        $unvoteRes->assertStatus(200);
        $this->assertEquals(0, $unvoteRes->json('total_votes'));
        $this->assertFalse($unvoteRes->json('options.0.is_voted_by_me'));
    }

    public function test_user_can_join_group_via_invite_code()
    {
        $creator = User::factory()->create();
        $newUser = User::factory()->create();

        $group = Group::create([
            'name' => 'Komunitas Laravel',
            'group_key' => bin2hex(random_bytes(32)),
            'created_by' => $creator->id,
            'invite_code' => 'laravel123',
        ]);
        GroupMember::create([
            'group_id' => $group->id,
            'user_id' => $creator->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($newUser, 'sanctum')->postJson('/api/groups/join-by-code', [
            'code' => 'laravel123',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('already_member', false);
        $response->assertJsonPath('group.id', $group->id);

        $this->assertDatabaseHas('group_members', [
            'group_id' => $group->id,
            'user_id' => $newUser->id,
            'role' => 'member',
        ]);

        // Join again when already a member
        $againResponse = $this->actingAs($newUser, 'sanctum')->postJson('/api/groups/join-by-code', [
            'code' => 'laravel123',
        ]);
        $againResponse->assertStatus(200);
        $againResponse->assertJsonPath('already_member', true);
    }
}
